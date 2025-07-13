// server/routes/questions.js
const express = require("express");
const router = express.Router();
const Question = require('../models/Question');
const { authenticateJWT } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Get all questions
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('Fetching questions for teacher:', req.user.user.id);
    const questions = await Question.find({ createdBy: req.user.user.id }).sort({ createdAt: -1 });
    
    // Handle migration for existing questions without term and class
    const questionsToUpdate = questions.filter(q => !q.term || !q.class);
    if (questionsToUpdate.length > 0) {
      console.log(`Found ${questionsToUpdate.length} questions that need migration`);
      for (const question of questionsToUpdate) {
        await Question.findByIdAndUpdate(question._id, {
          term: question.term || '1st Term',
          class: question.class || 'JSS1'
        });
      }
      // Fetch updated questions
      const updatedQuestions = await Question.find({ createdBy: req.user.user.id }).sort({ createdAt: -1 });
      console.log(`Found ${updatedQuestions.length} questions for teacher ${req.user.user.id} after migration`);
      res.json(updatedQuestions);
    } else {
      console.log(`Found ${questions.length} questions for teacher ${req.user.user.id}`);
      res.json(questions);
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Add a new question
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { question, options, correctAnswer, subject, term, class: questionClass, marks, explanation } = req.body;

    // Validate required fields
    if (!term || !['1st Term', '2nd Term', '3rd Term'].includes(term)) {
      return res.status(400).json({ message: 'Valid term is required (1st Term, 2nd Term, or 3rd Term)' });
    }

    if (!questionClass || !['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'].includes(questionClass)) {
      return res.status(400).json({ message: 'Valid class is required' });
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      subject,
      term,
      class: questionClass,
      marks,
      explanation,
      createdBy: req.user.user.id
    });

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete multiple questions
router.delete('/bulk', authenticateJWT, async (req, res) => {
  try {
    console.log('Attempting to delete questions:', req.body.questionIds);
    const { questionIds } = req.body;
    
    if (!questionIds || !Array.isArray(questionIds)) {
      console.log('Invalid question IDs:', questionIds);
      return res.status(400).json({ message: 'Invalid question IDs' });
    }

    console.log('Deleting questions for teacher:', req.user.user.id);
    const result = await Question.deleteMany({ 
      _id: { $in: questionIds },
      createdBy: req.user.user.id 
    });
    console.log('Questions deleted successfully:', result.deletedCount);
    res.json({ message: `${result.deletedCount} questions deleted successfully` });
  } catch (error) {
    console.error('Error deleting questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a question
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log('Attempting to update question:', req.params.id);
    const { question, options, correctAnswer, subject, term, class: questionClass, marks, explanation } = req.body;

    // Validate required fields
    if (!term || !['1st Term', '2nd Term', '3rd Term'].includes(term)) {
      return res.status(400).json({ message: 'Valid term is required (1st Term, 2nd Term, or 3rd Term)' });
    }

    if (!questionClass || !['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'].includes(questionClass)) {
      return res.status(400).json({ message: 'Valid class is required' });
    }

    const existingQuestion = await Question.findOne({ 
      _id: req.params.id,
      createdBy: req.user.user.id 
    });
    
    if (!existingQuestion) {
      console.log('Question not found or not owned by teacher:', req.params.id);
      return res.status(404).json({ message: 'Question not found' });
    }

    console.log('Found question, updating:', existingQuestion);
    
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        question,
        options,
        correctAnswer,
        subject,
        term,
        class: questionClass,
        marks,
        explanation,
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log('Question updated successfully');
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a single question
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    console.log('Attempting to delete question:', req.params.id);
    const question = await Question.findOne({ 
      _id: req.params.id,
      createdBy: req.user.user.id 
    });
    
    if (!question) {
      console.log('Question not found or not owned by teacher:', req.params.id);
      return res.status(404).json({ message: 'Question not found' });
    }

    console.log('Found question, deleting:', question);
    await Question.findByIdAndDelete(req.params.id);
    console.log('Question deleted successfully');
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and process document
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    try {
      // Process the file based on its type
      if (fileExt === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (fileExt === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      }

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      // Process the text into questions
      const questions = processDocumentText(text);

      if (questions.length === 0) {
        return res.status(400).json({ 
          message: 'No questions could be extracted from the document. Please check the format.' 
        });
      }

      // Add processing metadata
      const processedQuestions = questions.map(q => ({
        ...q,
        extractedAt: new Date().toISOString(),
        sourceFile: req.file.originalname
      }));

      res.json({ 
        questions: processedQuestions,
        message: `Successfully extracted ${questions.length} questions from the document.`,
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          processedAt: new Date().toISOString(),
          questionCount: questions.length
        }
      });
    } catch (error) {
      // Clean up the file if there's an error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ 
      message: 'Error processing file. Please make sure the document is properly formatted.',
      error: error.message
    });
  }
});

// Helper function to process document text into questions
function processDocumentText(text) {
  const questions = [];
  const questionBlocks = text.split(/\n\s*\n/);

  questionBlocks.forEach(block => {
    if (block.trim().length < 10) return; // Skip very short blocks

    const lines = block.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('Answer:') && !line.startsWith('Correct:'));

    if (lines.length < 3) return; // Skip blocks with too few lines

    // Try to identify the question and options
    const questionText = lines[0];
    const options = lines.slice(1, 5).filter(opt => opt.length > 0);
    
    // Skip if we don't have enough options
    if (options.length < 2) return;

    // Try to identify the correct answer
    let correctAnswer = 0;
    const lastLine = lines[lines.length - 1].toLowerCase();
    if (lastLine.includes('answer:') || lastLine.includes('correct:')) {
      const answerText = lastLine.split(':')[1].trim();
      
      // Check if it's a number (1,2,3,4) and convert to 0-based indexing
      const answerNumber = parseInt(answerText);
      if (!isNaN(answerNumber) && answerNumber >= 1 && answerNumber <= 4) {
        correctAnswer = answerNumber - 1; // Convert 1-based to 0-based
      } else {
        // Try to find by text matching (existing logic)
        correctAnswer = options.findIndex(opt => 
          opt.toLowerCase().includes(answerText.toLowerCase())
        );
        if (correctAnswer === -1) correctAnswer = 0;
      }
    }

    const question = {
      question: questionText,
      options: options,
      correctAnswer: correctAnswer,
      subject: 'General', // Default subject
      marks: 1 // Default marks
    };

    questions.push(question);
  });

  return questions;
}

module.exports = router;
