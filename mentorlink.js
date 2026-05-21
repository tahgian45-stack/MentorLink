
const firebaseConfig = {
  apiKey: "AIzaSyBNMY2hoXQEGnp7bHnxxRVAACHjCcU5ObE",
  authDomain: "rgskillbridge.firebaseapp.com",
  projectId: "rgskillbridge",
  storageBucket: "rgskillbridge.firebasestorage.app",
  messagingSenderId: "1044569946706",
  appId: "1:1044569946706:web:6acefd55d6900d98dbbd8b",
  measurementId: "G-3F9KCBW4MD",
};

// Initialize Firebase only once
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  if (firebase.analytics) {
    firebase.analytics();
  }
}

// Set persistence to LOCAL (keeps user logged in)
if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      console.error('Persistence error:', error);
    });
}


let currentUser = null;
let allMentors = {};
let allProjects = {};
let allStudents = {};
let allUsers = {};



/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User object or null
 */
function getCurrentUser() {
  return new Promise((resolve) => {
    if (typeof firebase === 'undefined') {
      resolve(null);
      return;
    }
    
    // Check for cached user first
    const cachedUser = sessionStorage.getItem('userData');
    if (cachedUser) {
      try {
        resolve(JSON.parse(cachedUser));
        return;
      } catch(e) {}
    }
    
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // Cache user data
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL
        };
        sessionStorage.setItem('userData', JSON.stringify(userData));
        currentUser = user;
        resolve(user);
      } else {
        currentUser = null;
        resolve(null);
      }
    });
  });
}

/**
 * Require authentication for protected pages
 * @param {string} redirectUrl - URL to redirect if not authenticated
 * @returns {Promise<Object>} User object
 */
function requireAuth(redirectUrl = 'LogIn.html') {
  return new Promise((resolve, reject) => {
    if (typeof firebase === 'undefined') {
      window.location.href = redirectUrl;
      reject('Firebase not loaded');
      return;
    }
    
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        resolve(user);
      } else {
        window.location.href = redirectUrl;
        reject('Not authenticated');
      }
    });
  });
}

/**
 * Logout user and clear session
 * @param {string} redirectUrl - URL to redirect after logout
 */
function logoutUser(redirectUrl = 'LogIn.html') {
  if (typeof firebase !== 'undefined') {
    // Show loading indicator
    const logoutBtn = document.querySelector('.logout, #dash-logout, #account-logout, #admin-logout');
    if (logoutBtn) {
      const originalText = logoutBtn.innerHTML;
      logoutBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Logging out...';
      logoutBtn.disabled = true;
    }
    
    firebase.auth().signOut()
      .then(() => {
        // Clear all stored data
        sessionStorage.clear();
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('userPrefs');
        
        // Clear global variables
        currentUser = null;
        allMentors = {};
        allProjects = {};
        allStudents = {};
        allUsers = {};
        
        window.location.href = redirectUrl;
      })
      .catch((error) => {
        console.error('Logout error:', error);
        window.location.href = redirectUrl;
      });
  } else {
    window.location.href = redirectUrl;
  }
}

/**
 * Check if current user is admin
 * @returns {Promise<boolean>} True if admin
 */
async function isAdmin() {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const userSnap = await firebase.database().ref('users/' + user.uid).once('value');
    const userData = userSnap.val();
    return userData?.role === 'admin' || userData?.isAdmin === true;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

/**
 * Update user profile
 * @param {string} uid - User ID
 * @param {Object} data - Profile data to update
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProfile(uid, data) {
  if (!uid) throw new Error('User ID required');
  
  try {
    await firebase.database().ref('users/' + uid).update({
      ...data,
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Profile update error:', error);
    throw error;
  }
}

/**
 * Get user profile by UID
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
async function getUserProfile(uid) {
  if (!uid) return null;
  
  try {
    const snap = await firebase.database().ref('users/' + uid).once('value');
    return snap.val();
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
}

/**
 * Save user profile to database
 * @param {string} uid - User ID
 * @param {Object} data - Profile data
 * @returns {Promise<void>}
 */
function saveProfileToDB(uid, data) {
  return firebase.database().ref("users/" + uid).set(data);
}

/**
 * Get profile from database
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Firebase snapshot
 */
function getProfileFromDB(uid) {
  return firebase.database().ref("users/" + uid).once("value");
}



/**
 * Get all users
 * @returns {Promise<Object>} All users data
 */
function getAllUsers() {
  return firebase.database().ref("users").once("value");
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User data or null
 */
async function getUserByEmail(email) {
  try {
    const usersSnap = await getAllUsers();
    const users = usersSnap.val() || {};
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.email === email) {
        return { uid, ...userData };
      }
    }
    return null;
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
}



/**
 * Save mentor to database
 * @param {Object} data - Mentor data
 * @returns {Promise<Object>} Firebase reference
 */
function saveMentorToDB(data) {
  return firebase.database().ref("mentors").push(data);
}

/**
 * Get all mentors
 * @returns {Promise<Object>} All mentors data
 */
function getAllMentors() {
  return firebase.database().ref("mentors").once("value");
}

/**
 * Update mentor by key
 * @param {string} key - Mentor key
 * @param {Object} data - Updated data
 * @returns {Promise<void>}
 */
function updateMentorInDB(key, data) {
  return firebase.database().ref("mentors/" + key).update(data);
}

/**
 * Delete mentor by key
 * @param {string} key - Mentor key
 * @returns {Promise<void>}
 */
function deleteMentorFromDB(key) {
  return firebase.database().ref("mentors/" + key).remove();
}

/**
 * Listen to mentors changes in real-time
 * @param {Function} callback - Callback function
 */
function onMentorsChange(cb) {
  if (typeof firebase === "undefined") return;
  firebase.database().ref("mentors").on("value", function (s) { 
    allMentors = s.val() || {};
    cb(allMentors); 
  });
}

/**
 * Get mentor by UID
 * @param {string} uid - User UID
 * @returns {Promise<Object|null>} Mentor data or null
 */
async function getMentorByUID(uid) {
  try {
    const mentorsSnap = await getAllMentors();
    const mentors = mentorsSnap.val() || {};
    for (const [key, mentor] of Object.entries(mentors)) {
      if (mentor.uid === uid) {
        return { key, ...mentor };
      }
    }
    return null;
  } catch (error) {
    console.error('Get mentor by UID error:', error);
    return null;
  }
}



/**
 * Save project to database
 * @param {Object} data - Project data
 * @returns {Promise<Object>} Firebase reference
 */
function saveProjectToDB(data) {
  return firebase.database().ref("projects").push(data);
}

/**
 * Get all projects
 * @returns {Promise<Object>} All projects data
 */
function getAllProjects() {
  return firebase.database().ref("projects").once("value");
}

/**
 * Update project by key
 * @param {string} key - Project key
 * @param {Object} data - Updated data
 * @returns {Promise<void>}
 */
function updateProjectInDB(key, data) {
  return firebase.database().ref("projects/" + key).update(data);
}

/**
 * Delete project by key
 * @param {string} key - Project key
 * @returns {Promise<void>}
 */
function deleteProjectFromDB(key) {
  return firebase.database().ref("projects/" + key).remove();
}

/**
 * Get projects by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User's projects
 */
async function getProjectsByUser(userId) {
  try {
    const projectsSnap = await getAllProjects();
    const projects = projectsSnap.val() || {};
    const userProjects = [];
    for (const [key, project] of Object.entries(projects)) {
      if (project.createdBy === userId) {
        userProjects.push({ key, ...project });
      }
    }
    return userProjects;
  } catch (error) {
    console.error('Get projects by user error:', error);
    return [];
  }
}



/**
 * Save student to database
 * @param {Object} data - Student data
 * @returns {Promise<Object>} Firebase reference
 */
function saveStudentToDB(data) {
  return firebase.database().ref("students").push(data);
}

/**
 * Get all students
 * @returns {Promise<Object>} All students data
 */
function getAllStudents() {
  return firebase.database().ref("students").once("value");
}

/**
 * Update student by key
 * @param {string} key - Student key
 * @param {Object} data - Updated data
 * @returns {Promise<void>}
 */
function updateStudentInDB(key, data) {
  return firebase.database().ref("students/" + key).update(data);
}

/**
 * Delete student by key
 * @param {string} key - Student key
 * @returns {Promise<void>}
 */
function deleteStudentFromDB(key) {
  return firebase.database().ref("students/" + key).remove();
}



const FAPSHI_LINK = "https://pay.fapshi.com/18869134";
const FAPSHI_LINK_UTM = "https://pay.fapshi.com/18869134?utm_source=mentorlink";

/**
 * Open Fapshi payment link
 */
function payWithFapshi() {
  window.open(FAPSHI_LINK_UTM, "_blank");
}

/**
 * Save payment record
 * @param {Object} paymentData - Payment information
 * @returns {Promise<void>}
 */
async function savePaymentRecord(paymentData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const paymentRecord = {
      userId: user.uid,
      userEmail: user.email,
      ...paymentData,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    await firebase.database().ref('payments/' + Date.now()).set(paymentRecord);
    return true;
  } catch (error) {
    console.error('Save payment error:', error);
    return false;
  }
}

/**
 * Get user payment history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Payment history
 */
async function getUserPayments(userId) {
  try {
    const paymentsSnap = await firebase.database().ref('payments').once('value');
    const payments = paymentsSnap.val() || {};
    const userPayments = [];
    for (const [key, payment] of Object.entries(payments)) {
      if (payment.userId === userId) {
        userPayments.push({ key, ...payment });
      }
    }
    return userPayments.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Get user payments error:', error);
    return [];
  }
}



/**
 * Create a booking session
 * @param {Object} bookingData - Booking information
 * @returns {Promise<void>}
 */
async function createBooking(bookingData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const booking = {
      ...bookingData,
      studentId: user.uid,
      studentEmail: user.email,
      createdAt: Date.now(),
      status: 'pending',
      bookingId: 'BK' + Date.now()
    };
    
    await firebase.database().ref('bookings/' + Date.now()).set(booking);
    return booking;
  } catch (error) {
    console.error('Create booking error:', error);
    throw error;
  }
}

/**
 * Get user bookings
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User bookings
 */
async function getUserBookings(userId) {
  try {
    const bookingsSnap = await firebase.database().ref('bookings').once('value');
    const bookings = bookingsSnap.val() || {};
    const userBookings = [];
    for (const [key, booking] of Object.entries(bookings)) {
      if (booking.studentId === userId || booking.mentorId === userId) {
        userBookings.push({ key, ...booking });
      }
    }
    return userBookings.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Get user bookings error:', error);
    return [];
  }
}

/**
 * Update booking status
 * @param {string} bookingKey - Booking key
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
async function updateBookingStatus(bookingKey, status) {
  try {
    await firebase.database().ref('bookings/' + bookingKey).update({
      status: status,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Update booking error:', error);
    throw error;
  }
}



/**
 * Send notification to user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 * @returns {Promise<void>}
 */
async function sendNotification(userId, notification) {
  try {
    const notifData = {
      userId: userId,
      ...notification,
      createdAt: Date.now(),
      read: false,
      notificationId: 'NOTIF' + Date.now()
    };
    await firebase.database().ref('notifications/' + Date.now()).set(notifData);
  } catch (error) {
    console.error('Send notification error:', error);
  }
}

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User notifications
 */
async function getUserNotifications(userId) {
  try {
    const notifsSnap = await firebase.database().ref('notifications').once('value');
    const notifs = notifsSnap.val() || {};
    const userNotifs = [];
    for (const [key, notif] of Object.entries(notifs)) {
      if (notif.userId === userId) {
        userNotifs.push({ key, ...notif });
      }
    }
    return userNotifs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Get notifications error:', error);
    return [];
  }
}

/**
 * Mark notification as read
 * @param {string} notifKey - Notification key
 * @returns {Promise<void>}
 */
async function markNotificationRead(notifKey) {
  try {
    await firebase.database().ref('notifications/' + notifKey).update({
      read: true,
      readAt: Date.now()
    });
  } catch (error) {
    console.error('Mark notification error:', error);
  }
}



/**
 * Show skeleton loader
 * @param {string} containerId - Container element ID
 */
function showSkeletonLoader(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const skeleton = document.createElement('div');
  skeleton.id = containerId + '-skeleton';
  skeleton.className = 'skeleton-loader';
  skeleton.innerHTML = `
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>
  `;
  container.appendChild(skeleton);
}

/**
 * Hide skeleton loader
 * @param {string} containerId - Container element ID
 */
function hideSkeletonLoader(containerId) {
  const skeleton = document.getElementById(containerId + '-skeleton');
  if (skeleton) skeleton.remove();
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'info', 'warning'
 */
function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease;
    font-size: 14px;
  `;
  
  toast.querySelector('button').style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    margin-left: 10px;
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast && toast.remove) toast.remove();
  }, 5000);
}

/**
 * Format date for display
 * @param {number|string} timestamp - Timestamp to format
 * @returns {string} Formatted date
 */
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format relative time (e.g., "2 days ago")
 * @param {number} timestamp - Timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}



/**
 * Initialize dashboard page
 */
async function initDashboard() {
  try {
    const user = await requireAuth();
    if (!user) return;
    
    // Load user profile
    const profile = await getUserProfile(user.uid);
    if (profile) {
      // Update UI with user data
      const welcomeEl = document.getElementById('dash-welcome');
      if (welcomeEl) welcomeEl.innerHTML = `Welcome back, ${profile.name || user.email.split('@')[0]}`;
      
      const nameEl = document.getElementById('dash-profile-name');
      if (nameEl) nameEl.textContent = profile.name || user.email.split('@')[0];
      
      const initialEl = document.getElementById('dash-profile-initial');
      if (initialEl) initialEl.textContent = (profile.name || 'U').charAt(0).toUpperCase();
      
      const roleEl = document.getElementById('dash-profile-role');
      if (roleEl) roleEl.textContent = profile.role || 'Member';
    }
    
    // Load statistics
    const projectsSnap = await getAllProjects();
    const projects = projectsSnap.val() || {};
    const userProjects = Object.values(projects).filter(p => p.createdBy === user.uid);
    const projectPct = Math.min(100, userProjects.length * 20);
    
    const pctEl = document.getElementById('dash-projects-pct');
    if (pctEl) pctEl.textContent = projectPct + '%';
    
    const progressBar = document.getElementById('fprogress');
    if (progressBar) progressBar.value = projectPct;
    
    const activeCount = document.getElementById('active-projects-count');
    if (activeCount) activeCount.textContent = userProjects.length;
    
    // Load mentors count
    const mentorsSnap = await getAllMentors();
    const mentors = mentorsSnap.val() || {};
    const mentorshipEl = document.getElementById('dash-mentorships-count');
    if (mentorshipEl) mentorshipEl.textContent = Object.keys(mentors).length;
    
    // Load certificates count
    const usersSnap = await getAllUsers();
    const certEl = document.getElementById('dash-cert-count');
    if (certEl) certEl.textContent = Object.keys(usersSnap.val() || {}).length;
    
    // Remove skeleton
    const skeleton = document.getElementById('sk-overlay-dashboard');
    if (skeleton) {
      setTimeout(() => {
        skeleton.style.opacity = '0';
        setTimeout(() => skeleton.remove(), 300);
      }, 500);
    }
    
  } catch (error) {
    console.error('Dashboard init error:', error);
    const skeleton = document.getElementById('sk-overlay-dashboard');
    if (skeleton) skeleton.remove();
  }
}

/**
 * Initialize mentor page
 */
async function initMentorPage() {
  try {
    const user = await requireAuth();
    if (!user) return;
    
    const mentorGrid = document.getElementById('mentor-grid');
    if (!mentorGrid) return;
    
    // Load mentors
    const mentorsSnap = await getAllMentors();
    const mentors = mentorsSnap.val() || {};
    
    // Hide skeleton
    const skeleton = document.getElementById('men-skeleton');
    if (skeleton) skeleton.style.display = 'none';
    
    renderMentorCards(mentors, mentorGrid);
    
    // Search functionality
    const searchInput = document.getElementById('mentor-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.toLowerCase();
        const filtered = {};
        Object.keys(mentors).forEach(key => {
          const mentor = mentors[key];
          if ((mentor.name || '').toLowerCase().includes(query) ||
              (mentor.skill || '').toLowerCase().includes(query)) {
            filtered[key] = mentor;
          }
        });
        renderMentorCards(filtered, mentorGrid);
      }, 300));
    }
    
  } catch (error) {
    console.error('Mentor page init error:', error);
    const skeleton = document.getElementById('men-skeleton');
    if (skeleton) skeleton.style.display = 'none';
  }
}

/**
 * Render mentor cards
 * @param {Object} mentors - Mentors data
 * @param {HTMLElement} container - Container element
 */
function renderMentorCards(mentors, container) {
  if (!container) return;
  container.innerHTML = '';
  
  if (Object.keys(mentors).length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No mentors found</p>';
    return;
  }
  
  Object.keys(mentors).forEach(key => {
    const mentor = mentors[key];
    const card = document.createElement('div');
    card.className = 'mentor-card';
    card.innerHTML = `
      <img src="${mentor.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e7ff%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}" alt="${mentor.name}" class="mentor-avatar">
      <h3>${mentor.name || 'Mentor'}</h3>
      <p class="skill">${mentor.skill || 'Various'}</p>
      <p class="rating">⭐ ${mentor.rating || '5.0'}</p>
      <p class="price">${mentor.price || 'Contact for rates'}</p>
      <button class="btn-book" onclick="bookMentor('${key}')">Book Session</button>
    `;
    container.appendChild(card);
  });
}

/**
 * Book a mentor session
 * @param {string} mentorKey - Mentor key
 */
async function bookMentor(mentorKey) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      showToast('Please login to book a session', 'warning');
      window.location.href = 'LogIn.html';
      return;
    }
    
    const mentorsSnap = await getAllMentors();
    const mentors = mentorsSnap.val() || {};
    const mentor = mentors[mentorKey];
    
    if (!mentor) {
      showToast('Mentor not found', 'error');
      return;
    }
    
    // Create booking
    const booking = await createBooking({
      mentorId: mentor.uid || mentorKey,
      mentorName: mentor.name,
      mentorSkill: mentor.skill,
      amount: mentor.price,
      sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    showToast(`Session booked with ${mentor.name}! Check your dashboard.`, 'success');
    
    // Redirect to payment
    setTimeout(() => {
      window.location.href = 'payment-page.html';
    }, 1500);
    
  } catch (error) {
    console.error('Book mentor error:', error);
    showToast('Failed to book session. Please try again.', 'error');
  }
}

/**
 * Initialize projects page
 */
async function initProjectsPage() {
  try {
    const user = await requireAuth();
    if (!user) return;
    
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    
    // Load projects
    const projectsSnap = await getAllProjects();
    const projects = projectsSnap.val() || {};
    
    // Hide skeleton
    const skeleton = document.getElementById('proj-skeleton');
    if (skeleton) skeleton.style.display = 'none';
    
    renderProjectCards(projects, projectList);
    
    // Search and filter
    const searchInput = document.getElementById('proj-search');
    const skillFilter = document.getElementById('proj-skill-filter');
    
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => filterProjects(projects, searchInput.value, skillFilter?.value), 300));
    }
    if (skillFilter) {
      skillFilter.addEventListener('change', () => filterProjects(projects, searchInput?.value, skillFilter.value));
    }
    
  } catch (error) {
    console.error('Projects page init error:', error);
    const skeleton = document.getElementById('proj-skeleton');
    if (skeleton) skeleton.style.display = 'none';
  }
}

/**
 * Render project cards
 * @param {Object} projects - Projects data
 * @param {HTMLElement} container - Container element
 */
function renderProjectCards(projects, container) {
  if (!container) return;
  container.innerHTML = '';
  
  if (Object.keys(projects).length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-folder-open"></i>
        <p>No projects yet. Be the first to post a project!</p>
      </div>
    `;
    return;
  }
  
  Object.keys(projects).forEach(key => {
    const project = projects[key];
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-title', (project.title || '').toLowerCase());
    card.setAttribute('data-skill', (project.skill || '').toLowerCase());
    card.innerHTML = `
      <div style="padding: 1.25rem;">
        <h3 style="margin-bottom: 0.5rem;">${project.title || 'Untitled Project'}</h3>
        <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">${project.description || 'No description'}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
          <span style="background: #e0e7ff; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem;">${project.skill || 'General'}</span>
          <span style="font-weight: 600; color: #4f46e5;">${project.budget || 'Contact for budget'}</span>
        </div>
        <button onclick="applyForProject('${key}')" style="margin-top: 1rem; width: 100%; padding: 0.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">Apply Now</button>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Filter projects
 * @param {Object} projects - All projects
 * @param {string} searchTerm - Search term
 * @param {string} skillFilter - Skill filter
 */
function filterProjects(projects, searchTerm, skillFilter) {
  const filtered = {};
  Object.entries(projects).forEach(([key, project]) => {
    const titleMatch = !searchTerm || (project.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const skillMatch = !skillFilter || (project.skill || '').toLowerCase() === skillFilter.toLowerCase();
    if (titleMatch && skillMatch) {
      filtered[key] = project;
    }
  });
  const container = document.getElementById('project-list');
  if (container) renderProjectCards(filtered, container);
}

/**
 * Apply for a project
 * @param {string} projectKey - Project key
 */
async function applyForProject(projectKey) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      showToast('Please login to apply for projects', 'warning');
      window.location.href = 'LogIn.html';
      return;
    }
    
    const projectsSnap = await getAllProjects();
    const projects = projectsSnap.val() || {};
    const project = projects[projectKey];
    
    if (!project) {
      showToast('Project not found', 'error');
      return;
    }
    
    // Create application
    const application = {
      projectId: projectKey,
      projectTitle: project.title,
      applicantId: user.uid,
      applicantName: user.displayName || user.email,
      appliedAt: Date.now(),
      status: 'pending'
    };
    
    await firebase.database().ref('applications/' + Date.now()).set(application);
    showToast(`Application submitted for ${project.title}!`, 'success');
    
  } catch (error) {
    console.error('Apply for project error:', error);
    showToast('Failed to apply. Please try again.', 'error');
  }
}

/**
 * Initialize account page
 */
async function initAccountPage() {
  try {
    const user = await requireAuth();
    if (!user) return;
    
    const profile = await getUserProfile(user.uid);
    
    if (profile) {
      const nameInput = document.getElementById('profile-name');
      const emailInput = document.getElementById('profile-email');
      const roleSelect = document.getElementById('profile-role');
      const bioTextarea = document.getElementById('profile-bio');
      const previewImg = document.getElementById('profile-img-preview');
      
      if (nameInput) nameInput.value = profile.name || '';
      if (emailInput) emailInput.value = user.email || '';
      if (roleSelect) roleSelect.value = profile.role || 'student';
      if (bioTextarea) bioTextarea.value = profile.bio || '';
      if (previewImg && profile.image) previewImg.src = profile.image;
      
      // Load stats
      const memberSince = new Date(profile.createdAt || user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const memberSinceEl = document.getElementById('member-since');
      if (memberSinceEl) memberSinceEl.textContent = memberSince;
      
      const projectsSnap = await getAllProjects();
      const projects = projectsSnap.val() || {};
      const userProjects = Object.values(projects).filter(p => p.createdBy === user.uid);
      const projectsEl = document.getElementById('user-projects');
      if (projectsEl) projectsEl.textContent = userProjects.length;
    }
    
    // Remove skeleton
    const skeleton = document.getElementById('sk-overlay-account');
    if (skeleton) skeleton.remove();
    
  } catch (error) {
    console.error('Account page init error:', error);
    const skeleton = document.getElementById('sk-overlay-account');
    if (skeleton) skeleton.remove();
  }
}


async function initStudentsPage() {
  try {
    const user = await requireAuth();
    if (!user) return;
    
    // Load students
    const studentsSnap = await getAllStudents();
    allStudents = studentsSnap.val() || {};
    
    // Hide skeleton
    const skeleton = document.getElementById('stu-skeleton');
    if (skeleton) skeleton.style.display = 'none';
    
    renderStudentCards(allStudents);
    
    // Search and filter
    const searchInput = document.getElementById('student-search');
    const levelFilter = document.getElementById('student-level-filter');
    
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => filterStudents(searchInput.value, levelFilter?.value), 300));
    }
    if (levelFilter) {
      levelFilter.addEventListener('change', () => filterStudents(searchInput?.value, levelFilter.value));
    }
    
  } catch (error) {
    console.error('Students page init error:', error);
    const skeleton = document.getElementById('stu-skeleton');
    if (skeleton) skeleton.style.display = 'none';
  }
}

/**
 * Render student cards
 * @param {Object} students - Students data
 */
function renderStudentCards(students) {
  const grid = document.getElementById('stu-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (Object.keys(students).length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No students found</p>';
    return;
  }
  
  Object.entries(students).forEach(([key, student]) => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.setAttribute('data-name', (student.name || '').toLowerCase());
    card.setAttribute('data-level', (student.level || 'beginner').toLowerCase());
    
    const imgHtml = student.image 
      ? `<img src="${student.image}" alt="${student.name}" class="student-avatar">`
      : `<div class="student-avatar" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:white;font-size:1.5rem;">${(student.name || 'S').charAt(0).toUpperCase()}</div>`;
    
    card.innerHTML = `
      <div class="student-header">
        ${imgHtml}
        <div class="student-info">
          <h3>${student.name || 'Student'}</h3>
          <span class="student-level">${student.level || 'Beginner'}</span>
        </div>
      </div>
      <div class="student-details">
        <p><strong>Skills:</strong> ${student.skills || 'Not specified'}</p>
        <p><strong>Goal:</strong> ${student.goal || 'Looking for mentorship'}</p>
        <p><strong>Email:</strong> ${student.email || 'Not provided'}</p>
      </div>
      <button class="btn-connect" onclick="connectWithStudent('${key}')">Connect with Student</button>
    `;
    grid.appendChild(card);
  });
}

/**
 * Filter students
 * @param {string} searchTerm - Search term
 * @param {string} levelFilter - Level filter
 */
function filterStudents(searchTerm, levelFilter) {
  const filtered = {};
  Object.entries(allStudents).forEach(([key, student]) => {
    const nameMatch = !searchTerm || (student.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const skillMatch = !searchTerm || (student.skills || '').toLowerCase().includes(searchTerm.toLowerCase());
    const levelMatch = !levelFilter || levelFilter === 'All Levels' || (student.level || 'beginner').toLowerCase() === levelFilter.toLowerCase();
    
    if ((nameMatch || skillMatch) && levelMatch) {
      filtered[key] = student;
    }
  });
  renderStudentCards(filtered);
}

/**
 * Connect with a student
 * @param {string} studentKey - Student key
 */
function connectWithStudent(studentKey) {
  const student = allStudents[studentKey];
  if (student && student.email) {
    window.location.href = `mailto:${student.email}?subject=Mentorship Inquiry from MentorLink`;
  } else {
    showToast(`Connect with ${student?.name || 'student'}! They will be notified.`, 'info');
  }
}

/**
 * Initialize admin panel
 */
async function initAdminPanel() {
  try {
    const user = await requireAuth();
    if (!user) return;
    
    // Check if admin
    const admin = await isAdmin();
    if (!admin) {
      showToast('Access denied. Admin privileges required.', 'error');
      window.location.href = 'dashboard-1.html';
      return;
    }
    
    // Load all data
    const usersSnap = await getAllUsers();
    const users = usersSnap.val() || {};
    document.getElementById('total-users').textContent = Object.keys(users).length;
    
    const mentorsSnap = await getAllMentors();
    const mentors = mentorsSnap.val() || {};
    document.getElementById('total-mentors').textContent = Object.keys(mentors).length;
    
    const projectsSnap = await getAllProjects();
    const projects = projectsSnap.val() || {};
    document.getElementById('total-projects').textContent = Object.keys(projects).length;
    
    const studentsSnap = await getAllStudents();
    const students = studentsSnap.val() || {};
    document.getElementById('total-students').textContent = Object.keys(students).length;
    
    // Render lists
    renderAdminUsersList(users);
    renderAdminMentorsList(mentors);
    renderAdminProjectsList(projects);
    
    // Remove skeleton
    const skeleton = document.getElementById('sk-overlay-admin');
    if (skeleton) skeleton.remove();
    
  } catch (error) {
    console.error('Admin panel init error:', error);
    const skeleton = document.getElementById('sk-overlay-admin');
    if (skeleton) skeleton.remove();
  }
}

/**
 * Render admin users list
 * @param {Object} users - Users data
 */
function renderAdminUsersList(users) {
  const container = document.getElementById('admin-users-list');
  if (!container) return;
  container.innerHTML = '';
  
  Object.entries(users).forEach(([uid, userData]) => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
      <div class="user-avatar">${(userData.name || 'U').charAt(0).toUpperCase()}</div>
      <div class="user-info">
        <h4>${userData.name || 'Anonymous'}</h4>
        <p>${userData.email || 'No email'} • ${userData.role || 'student'}</p>
      </div>
      <button class="delete-btn" onclick="deleteUser('${uid}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

/**
 * Render admin mentors list
 * @param {Object} mentors - Mentors data
 */
function renderAdminMentorsList(mentors) {
  const container = document.getElementById('admin-mentors-list');
  if (!container) return;
  container.innerHTML = '';
  
  Object.entries(mentors).forEach(([key, mentor]) => {
    const div = document.createElement('div');
    div.className = 'mentor-item';
    div.innerHTML = `
      <div class="mentor-avatar">${(mentor.name || 'M').charAt(0).toUpperCase()}</div>
      <div class="mentor-info">
        <h4>${mentor.name || 'Mentor'}</h4>
        <p>${mentor.skill || 'Various'} • ${mentor.price || 'Contact for rates'}</p>
      </div>
      <button class="delete-btn" onclick="deleteMentor('${key}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

/**
 * Render admin projects list
 * @param {Object} projects - Projects data
 */
function renderAdminProjectsList(projects) {
  const container = document.getElementById('admin-projects-list');
  if (!container) return;
  container.innerHTML = '';
  
  Object.entries(projects).forEach(([key, project]) => {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
      <div class="user-info" style="flex:1">
        <h4>${project.title || 'Untitled Project'}</h4>
        <p>${project.description?.substring(0, 100) || 'No description'}</p>
      </div>
      <button class="delete-btn" onclick="deleteProject('${key}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

/**
 * Delete user (admin only)
 * @param {string} uid - User ID
 */
async function deleteUser(uid) {
  if (confirm('Delete this user? This action cannot be undone.')) {
    try {
      await firebase.database().ref('users/' + uid).remove();
      showToast('User deleted successfully', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      console.error('Delete user error:', error);
      showToast('Failed to delete user', 'error');
    }
  }
}

/**
 * Delete mentor (admin only)
 * @param {string} key - Mentor key
 */
async function deleteMentor(key) {
  if (confirm('Delete this mentor? This action cannot be undone.')) {
    try {
      await deleteMentorFromDB(key);
      showToast('Mentor deleted successfully', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      console.error('Delete mentor error:', error);
      showToast('Failed to delete mentor', 'error');
    }
  }
}

/**
 * Delete project (admin only)
 * @param {string} key - Project key
 */
async function deleteProject(key) {
  if (confirm('Delete this project? This action cannot be undone.')) {
    try {
      await deleteProjectFromDB(key);
      showToast('Project deleted successfully', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      console.error('Delete project error:', error);
      showToast('Failed to delete project', 'error');
    }
  }
}


// Add CSS animations to document
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .toast-notification button:hover {
    opacity: 0.8;
  }
  
  .delete-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 5px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: background 0.2s;
  }
  
  .delete-btn:hover {
    background: #dc2626;
  }
`;
document.head.appendChild(style);

// Initialize page based on current URL
document.addEventListener('DOMContentLoaded', function() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'Landing.html';
  
  // Initialize hamburger menu (mobile)
  initMobileMenu();
  
  // Initialize page-specific functionality
  if (page === 'dashboard-1.html' || page === 'dashboard.html') {
    initDashboard();
  } else if (page === 'MentorPage.html') {
    initMentorPage();
  } else if (page === 'Projects.html') {
    initProjectsPage();
  } else if (page === 'Account.html') {
    initAccountPage();
  } else if (page === 'Students.html') {
    initStudentsPage();
  } else if (page === 'AdminPanel.html') {
    initAdminPanel();
  }
  
  // Setup global logout buttons
  document.querySelectorAll('.logout, #dash-logout, #account-logout, #admin-logout').forEach(el => {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      logoutUser();
    });
  });
  
  // Remove skeleton overlays after page load
  setTimeout(() => {
    document.querySelectorAll('[id^="sk-overlay-"]').forEach(el => {
      if (el && el.remove) el.remove();
    });
  }, 2000);
});

/**
 * Initialize mobile hamburger menu
 */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav, #second');
  
  if (hamburger && nav) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      hamburger.classList.toggle('active');
      nav.classList.toggle('active');
    });
    
    // Close menu when clicking a link
    nav.querySelectorAll('a, button, span').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('header') && !e.target.closest('nav') && nav.classList.contains('active')) {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
      }
    });
  }
}


window.payWithFapshi = payWithFapshi;
window.bookMentor = bookMentor;
window.applyForProject = applyForProject;
window.connectWithStudent = connectWithStudent;
window.deleteUser = deleteUser;
window.deleteMentor = deleteMentor;
window.deleteProject = deleteProject;
window.logoutUser = logoutUser;
window.requireAuth = requireAuth;
window.showToast = showToast;
window.formatDate = formatDate;
window.formatRelativeTime = formatRelativeTime;