// routes/file-storage.js
// Multi-tenant file storage routes with complete school isolation

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant, injectSchoolId, preventCrossSchoolAccess, validateTenantResourceAccess } = require('../middleware/tenantScoping');
const FileStoragePostgres = require('../models/FileStoragePostgres');

// Configure multer for file uploads with school-based directory structure
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Generate school-specific directory path
    const schoolId = req.tenant?.schoolId;
    if (!schoolId) {
      return cb(new Error('School context required for file upload'), null);
    }
    
    const fileType = req.body.fileType || 'general';
    const schoolDir = path.join('uploads', `school-${schoolId}`, fileType);
    
    // Create directory if it doesn't exist
    fs.mkdir(schoolDir, { recursive: true }).catch(console.error);
    
    cb(null, schoolDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|ppt|pptx/;
    const extname = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

/**
 * POST /api/files/upload
 * Upload a file with school-based isolation
 */
router.post('/upload', authenticateJWT, enforceMultiTenant, injectSchoolId, preventCrossSchoolAccess, upload.single('file'), async (req, res) => {
  try {
    const { schoolId, userId } = req.tenant;
    const { fileType = 'general', description = '' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Create file record in database
    const fileData = {
      schoolId,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileType,
      uploadedBy: userId,
      metadata: {
        description,
        uploadedAt: new Date().toISOString(),
        ip: req.ip
      }
    };

    const fileRecord = await FileStoragePostgres.create(fileData);

    res.status(201).json({
      success: true,
      file: {
        id: fileRecord.id,
        fileName: fileRecord.file_name,
        originalName: fileRecord.original_name,
        fileSize: fileRecord.file_size,
        mimeType: fileRecord.mime_type,
        fileType: fileRecord.file_type,
        uploadedAt: fileRecord.created_at
      },
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file && req.file.path) {
      fs.unlink(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      error: 'File upload failed',
      message: error.message
    });
  }
});

/**
 * GET /api/files
 * List files for the authenticated user's school
 */
router.get('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId } = req.tenant;
    const { 
      page = 1, 
      limit = 20, 
      fileType, 
      search,
      uploadedBy 
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      fileType,
      search,
      uploadedBy: uploadedBy ? parseInt(uploadedBy) : null
    };

    const result = await FileStoragePostgres.findBySchool(schoolId, options);

    res.json({
      success: true,
      files: result.files,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: error.message
    });
  }
});

/**
 * GET /api/files/:fileId
 * Get a specific file with metadata
 */
router.get('/:fileId', authenticateJWT, enforceMultiTenant, (req, res, next) => validateTenantResourceAccess(req, req.params.fileId, 'file')(req, res, next), async (req, res) => {
  try {
    const { file } = await FileStoragePostgres.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Check if file exists on disk
    try {
      await fs.access(file.file_path);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found on disk',
        message: 'The file may have been deleted'
      });
    }

    res.json({
      success: true,
      file: {
        id: file.id,
        fileName: file.file_name,
        originalName: file.original_name,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        fileType: file.file_type,
        filePath: file.file_path,
        uploadedBy: file.uploaded_by,
        uploadedAt: file.created_at,
        metadata: file.metadata
      }
    });

  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      error: 'Failed to fetch file',
      message: error.message
    });
  }
});

/**
 * GET /api/files/:fileId/download
 * Download a specific file
 */
router.get('/:fileId/download', authenticateJWT, enforceMultiTenant, (req, res, next) => validateTenantResourceAccess(req, req.params.fileId, 'file')(req, res, next), async (req, res) => {
  try {
    const { file } = await FileStoragePostgres.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Check if file exists on disk
    try {
      await fs.access(file.file_path);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found on disk',
        message: 'The file may have been deleted'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Length', file.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      error: 'Failed to download file',
      message: error.message
    });
  }
});

/**
 * PUT /api/files/:fileId
 * Update file metadata
 */
router.put('/:fileId', authenticateJWT, enforceMultiTenant, injectSchoolId, preventCrossSchoolAccess, (req, res, next) => validateTenantResourceAccess(req, req.params.fileId, 'file')(req, res, next), async (req, res) => {
  try {
    const { schoolId, userId } = req.tenant;
    const { description, fileType } = req.body;

    const updateData = {};
    
    if (description !== undefined) {
      updateData.metadata = { description };
    }
    
    if (fileType !== undefined) {
      updateData.file_type = fileType;
    }

    const updatedFile = await FileStoragePostgres.update(req.params.fileId, updateData);

    if (!updatedFile) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    res.json({
      success: true,
      file: {
        id: updatedFile.id,
        fileName: updatedFile.file_name,
        originalName: updatedFile.original_name,
        fileSize: updatedFile.file_size,
        mimeType: updatedFile.mime_type,
        fileType: updatedFile.file_type,
        uploadedAt: updatedFile.updated_at,
        metadata: updatedFile.metadata
      },
      message: 'File updated successfully'
    });

  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      error: 'Failed to update file',
      message: error.message
    });
  }
});

/**
 * DELETE /api/files/:fileId
 * Delete a file (soft delete)
 */
router.delete('/:fileId', authenticateJWT, enforceMultiTenant, injectSchoolId, preventCrossSchoolAccess, (req, res, next) => validateTenantResourceAccess(req, req.params.fileId, 'file')(req, res, next), async (req, res) => {
  try {
    const { file } = await FileStoragePostgres.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Soft delete the file
    const deletedFile = await FileStoragePostgres.softDelete(req.params.fileId);

    // Optionally delete the actual file from disk (uncomment if needed)
    // try {
    //   await fs.unlink(file.file_path);
    // } catch (error) {
    //   console.warn('Could not delete file from disk:', error);
    // }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

/**
 * GET /api/files/stats
 * Get file storage statistics for the school
 */
router.get('/stats', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId } = req.tenant;
    
    const stats = await FileStoragePostgres.getSchoolStats(schoolId);

    res.json({
      success: true,
      stats: {
        totalFiles: stats.total_files,
        examFiles: stats.exam_files,
        submissionFiles: stats.submission_files,
        profileFiles: stats.profile_files,
        materialFiles: stats.material_files,
        totalStorageUsed: stats.total_storage_used,
        recentFiles: stats.recent_files
      }
    });

  } catch (error) {
    console.error('Error fetching file stats:', error);
    res.status(500).json({
      error: 'Failed to fetch file statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/files/types/:fileType
 * Get files of a specific type
 */
router.get('/types/:fileType', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId } = req.tenant;
    const { fileType } = req.params;
    const { page = 1, limit = 20, search } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    };

    const result = await FileStoragePostgres.findByTypeAndSchool(schoolId, fileType, options);

    res.json({
      success: true,
      files: result.files,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching files by type:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: error.message
    });
  }
});

/**
 * GET /api/files/user/:userId
 * Get files uploaded by a specific user
 */
router.get('/user/:userId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId } = req.tenant;
    const { userId } = req.params;
    const { page = 1, limit = 20, fileType } = req.query;

    // Verify user belongs to this school
    const userValidation = await FileStoragePostgres.verifySchoolMembership(userId, schoolId);
    if (!userValidation) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view files from your own school'
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      fileType
    };

    const result = await FileStoragePostgres.findByUploader(userId, options);

    res.json({
      success: true,
      files: result.files,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({
      error: 'Failed to fetch user files',
      message: error.message
    });
  }
});

/**
 * POST /api/files/batch-upload
 * Upload multiple files at once
 */
router.post('/batch-upload', authenticateJWT, enforceMultiTenant, injectSchoolId, preventCrossSchoolAccess, upload.array('files', 5), async (req, res) => {
  try {
    const { schoolId, userId } = req.tenant;
    const { fileType = 'general', description = '' } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    const uploadedFiles = [];
    const errors = [];

    // Process each file
    for (const file of req.files) {
      try {
        const fileData = {
          schoolId,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileType,
          uploadedBy: userId,
          metadata: {
            description,
            batchUpload: true,
            uploadedAt: new Date().toISOString(),
            ip: req.ip
          }
        };

        const fileRecord = await FileStoragePostgres.create(fileData);
        uploadedFiles.push({
          id: fileRecord.id,
          fileName: fileRecord.file_name,
          originalName: fileRecord.original_name,
          fileSize: fileRecord.file_size,
          mimeType: fileRecord.mime_type,
          fileType: fileRecord.file_type
        });
      } catch (error) {
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
        
        // Clean up failed file
        if (file.path) {
          fs.unlink(file.path).catch(console.error);
        }
      }
    }

    res.status(201).json({
      success: true,
      uploadedFiles,
      errors,
      summary: {
        total: req.files.length,
        successful: uploadedFiles.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({
      error: 'Batch upload failed',
      message: error.message
    });
  }
});

module.exports = router;
