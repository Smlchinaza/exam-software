import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, API_URL } from "../services/api";
import apiClient from "../services/subdomainApi";
import { extractCurrentSubdomain, getStoredSubdomainLoginData } from "../utils/subdomain";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper function to extract school_id from JWT
const extractSchoolIdFromToken = (token) => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.school_id || null;
  } catch (error) {
    console.error("Error extracting school_id from token:", error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnSubdomain, setIsOnSubdomain] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState(null);

  useEffect(() => {
    // Initialize subdomain context
    const subdomain = extractCurrentSubdomain();
    setIsOnSubdomain(subdomain !== null);
    setCurrentSubdomain(subdomain);

    // Check for stored auth data on mount
    const checkAuth = async () => {
      try {
        // First, check for cross-domain login data
        const storedLoginData = getStoredSubdomainLoginData();
        
        if (storedLoginData && storedLoginData.token && storedLoginData.user) {
          // Use cross-domain login data
          setUser(storedLoginData.user);
          setSchool(storedLoginData.school);
          setSchoolId(storedLoginData.user.school_id);
          
          // Store in appropriate storage
          const storage = localStorage;
          storage.setItem("token", storedLoginData.token);
          storage.setItem("user", JSON.stringify(storedLoginData.user));
          storage.setItem("school", JSON.stringify(storedLoginData.school));
          storage.setItem("schoolId", storedLoginData.user.school_id);
          
          return;
        }

        // Fallback to regular auth check
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const storedUser =
          localStorage.getItem("user") || sessionStorage.getItem("user");
        const storedSchoolId =
          localStorage.getItem("schoolId") || sessionStorage.getItem("schoolId");
        const storedSchool =
          localStorage.getItem("school") || sessionStorage.getItem("school");

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
          // Use stored schoolId or extract from token
          if (storedSchoolId) {
            setSchoolId(storedSchoolId);
          } else {
            const extractedSchoolId = extractSchoolIdFromToken(token);
            if (extractedSchoolId) {
              setSchoolId(extractedSchoolId);
            }
          }
          // Restore school data if available
          if (storedSchool) {
            setSchool(JSON.parse(storedSchool));
          } else if (storedSchoolId) {
            // Fetch school data if we have schoolId but no school data
            try {
              const schoolResponse = await fetch(`${API_URL}/schools/current`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (schoolResponse.ok) {
                const schoolData = await schoolResponse.json();
                setSchool(schoolData);
                // Store school data
                const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
                storage.setItem("school", JSON.stringify(schoolData));
              }
            } catch (error) {
              console.error("Error fetching school data:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    let timer;
    const logoutAfterInactivity = () => {
      logout();
      window.location.href = "/login";
    };

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(logoutAfterInactivity, 300000); // 5 minutes
    };

    // List of events that indicate user activity
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Start the timer initially
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout]);

  const login = async (emailOrObj, password, rememberMe) => {
    let email;
    // eslint-disable-next-line no-unused-vars
    let role;
    if (typeof emailOrObj === "object") {
      email = emailOrObj.email;
      password = emailOrObj.password;
      // eslint-disable-next-line no-unused-vars
      role = emailOrObj.role;
      rememberMe = emailOrObj.rememberMe;
    } else {
      email = emailOrObj;
    }
    try {
      console.log("AuthContext: Attempting login with:", {
        email,
        rememberMe,
        isOnSubdomain,
        currentSubdomain
      });

      // Use subdomain-aware API client if on subdomain
      let response;
      if (isOnSubdomain) {
        response = await apiClient.login(email, password, rememberMe);
      } else {
        // Fallback to regular API for main domain
        response = await authApi.login(email, password);
      }

      console.log("AuthContext: Login response:", response);
      
      if (!response || !response.token || !response.user) {
        throw new Error("Invalid response from server");
      }

      // Extract school_id from JWT payload
      const extractedSchoolId = response.user.school_id || extractSchoolIdFromToken(response.token);
      
      // Store auth data based on rememberMe preference
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", response.token);
      storage.setItem("user", JSON.stringify(response.user));
      
      if (extractedSchoolId) {
        storage.setItem("schoolId", extractedSchoolId);
        setSchoolId(extractedSchoolId);
      }
      
      storage.setItem("rememberMe", rememberMe);
      setUser(response.user);
      
      // Set school data if available in response
      if (response.school) {
        setSchool(response.school);
        storage.setItem("school", JSON.stringify(response.school));
      }
      
      // Update API client with school context
      if (apiClient.updateSchoolContext && response.school) {
        apiClient.updateSchoolContext(response.school);
      }
      
      return response;
    } catch (error) {
      console.error("AuthContext: Login error:", error);
      throw new Error(
        error.message ||
          "Failed to login. Please check your credentials and try again.",
      );
    }
  };

  const register = async (userData) => {
    try {
      console.log("AuthContext: Attempting registration with:", {
        email: userData.email,
        role: userData.role,
      });

      // New Postgres backend register - simplified payload
      const response = await authApi.register({
        email: userData.email,
        password: userData.password,
        role: userData.role || 'student',
        firstName: userData.firstName || userData.displayName || '',
        lastName: userData.lastName || '',
      });
      console.log("AuthContext: Registration response:", response);

      if (!response || !response.token || !response.user) {
        throw new Error("Invalid response from server");
      }

      // Extract school_id from JWT payload
      const extractedSchoolId = extractSchoolIdFromToken(response.token);

      // Store auth data based on rememberMe preference
      const storage = userData.rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", response.token);
      storage.setItem("user", JSON.stringify(response.user));
      if (extractedSchoolId) {
        storage.setItem("schoolId", extractedSchoolId);
        setSchoolId(extractedSchoolId);
      }
      storage.setItem("rememberMe", userData.rememberMe);

      setUser(response.user);
      return response;
    } catch (error) {
      console.error("AuthContext: Registration error:", error);
      throw new Error(error.message || "Failed to register. Please try again.");
    }
  };

  const signupStudent = async (
    email,
    password,
    displayName,
    currentClass,
    dateOfBirth,
    gender,
    phone,
    address,
    parentName,
    parentPhone,
    emergencyContact,
  ) => {
    try {
      const response = await authApi.register({
        email,
        password,
        role: "student",
        displayName,
        currentClass,
        dateOfBirth,
        gender,
        phone,
        address,
        parentName,
        parentPhone,
        emergencyContact,
      });
      return response.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Use subdomain-aware logout if on subdomain
      if (isOnSubdomain) {
        await apiClient.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    
    // Clear all storage
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("schoolId");
    localStorage.removeItem("school");
    localStorage.removeItem("rememberMe");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("schoolId");
    sessionStorage.removeItem("school");
    sessionStorage.removeItem("subdomainLoginData");
    
    setUser(null);
    setSchoolId(null);
    setSchool(null);
  };

  const value = {
    user,
    schoolId,
    school,
    loading,
    isOnSubdomain,
    currentSubdomain,
    login,
    register,
    signupStudent,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
