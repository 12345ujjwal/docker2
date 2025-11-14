//Handle Signup
function signup(event) {
  event.preventDefault();
  const form = event.target;
  const signupButton = form.querySelector('button[type="submit"]');
  const originalButtonText = signupButton.innerText;

  // Disable button to prevent multiple submissions
  signupButton.disabled = true;
  signupButton.innerText = 'Signing Up...';

  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const role = document.querySelector('input[name="role"]:checked').value;
  
  // Create user with Firebase Auth
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User created successfully. Now save additional info to Firestore.
      const user = userCredential.user;
      const userProfile = {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        courses: []
      };

      // Add role-specific fields
      if (role === 'student') {
        userProfile.college = document.getElementById('college').value;
        userProfile.course = document.getElementById('course').value;
        userProfile.year = document.getElementById('year').value;
        userProfile.mobile = document.getElementById('mobile').value;
      } else if (role === 'tutor') {
        userProfile.subject = document.getElementById('subject').value;
        userProfile.age = document.getElementById('age').value;
        userProfile.experience = document.getElementById('experience').value;
      }

      // Determine the correct collection based on the role
      const collectionName = (role === 'tutor') ? 'tutors' : 'users';
      return db.collection(collectionName).doc(user.uid).set(userProfile);
    })
    .then(() => {
      // On success, redirect to the login page
      window.location.href = "login.html";
    })
    .catch((error) => {
      alert(`Error: ${error.message}`);
      console.error("Signup Error:", error);
      // Re-enable the button on error
      signupButton.disabled = false;
      signupButton.innerText = originalButtonText;
    });
}

//Handle Login
function login(event) {
  event.preventDefault();
  const form = event.target;
  const loginButton = form.querySelector('button[type="submit"]');
  const originalButtonText = loginButton.innerText;

  // Disable button to prevent multiple submissions
  loginButton.disabled = true;
  loginButton.innerText = 'Logging In...';

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const role = document.querySelector('input[name="role"]:checked').value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Determine which collection to check based on the selected role
      const collectionName = (role === 'tutor') ? 'tutors' : 'users';
      return db.collection(collectionName).doc(userCredential.user.uid).get();
    })
    .then((doc) => {
      if (doc.exists) {
        // Document exists in the correct collection, so the role is correct.
        if (role === 'tutor') {
          window.location.href = "tutor-dashboard.html";
        } else {
          window.location.href = "dashboard.html";
        }
      } else {
        // Document doesn't exist in the selected collection, so the role is wrong.
        auth.signOut(); // Log out the user
        alert(`Login failed. You are not registered as a ${role}. Please select the correct role and try again.`);
        // Re-enable button on failure
        loginButton.disabled = false;
        loginButton.innerText = originalButtonText;
      }
    })
    .catch((error) => {
      alert(`Error: ${error.message}`);
      console.error("Login Error:", error);
      // Re-enable button on error
      loginButton.disabled = false;
      loginButton.innerText = originalButtonText;
    });
}

//Load Dashboard Info
function loadDashboard() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in. We need to figure out if they are a student or tutor.
      // We'll check the 'tutors' collection first.
      const tutorRef = db.collection('tutors').doc(user.uid);
      tutorRef.get().then(doc => {
        if (doc.exists) {
          // User is a tutor
          populateDashboard(doc.data());
          // Manually trigger tutor-specific data loading
          const user = auth.currentUser;
          if (user) {
            loadTutorCourses(user.uid);
            loadTutorStudents(user.uid);
          }
        } else {
          // User is not a tutor, so check the 'users' (student) collection.
          const studentRef = db.collection('users').doc(user.uid);
          studentRef.get().then(studentDoc => {
            if (studentDoc.exists) {
              // User is a student
              populateDashboard(studentDoc.data());
            } else {
              // User exists in Auth but not in any database collection. This is an error state.
              console.error("User document not found in 'users' or 'tutors' collection!");
              logout();
            }
          });
        }
      }).catch(error => {
        console.error("Error fetching user data:", error);
        logout();
      });
    } else {
      // No user is signed in, redirect to login page
      window.location.href = "login.html";
    }
  });
}

// New helper function to populate dashboard with user data
function populateDashboard(userData) {
  // Welcome message
  const welcomeUserEl = document.getElementById("welcomeUser");
  if (welcomeUserEl) {
    welcomeUserEl.innerText = `Welcome, ${userData.name}!`;
  }

  // --- STUDENT-SPECIFIC LOGIC ---
  // Enrolled Courses Panel
  const enrolledCoursesList = document.getElementById("enrolledCourses");
  if (enrolledCoursesList) {
    enrolledCoursesList.innerHTML = "";
    if (!userData.courses || userData.courses.length === 0) {
      enrolledCoursesList.innerHTML = "<li><p>No courses enrolled yet. You can enroll from the <a href='courses.html'>Courses</a> page.</p></li>";
    } else {
      // The `courses` array now stores objects {id, title}
      userData.courses.forEach(course => { 
        let li = document.createElement("li");
        // In the future, you could make this a link to the course details page
        li.innerText = course.title; 
        enrolledCoursesList.appendChild(li);
      });
    }
  }

  // --- TUTOR-SPECIFIC LOGIC ---

  // Profile Panel
  const userProfileDiv = document.getElementById("userProfile");
  if (userProfileDiv) {
    let profileHTML = `
      <p><strong>Full Name:</strong> <span>${userData.name}</span></p>
      <p><strong>Email:</strong> <span>${userData.email}</span></p>
      <p><strong>Role:</strong> <span>${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</span></p>
    `;
    if (userData.role === 'student') {
      profileHTML += `
        <p><strong>College:</strong> <span>${userData.college || 'N/A'}</span></p>
        <p><strong>Course:</strong> <span>${userData.course || 'N/A'}</span></p>
        <p><strong>Year:</strong> <span>${userData.year || 'N/A'}</span></p>
        <p><strong>Mobile:</strong> <span>${userData.mobile || 'N/A'}</span></p>
      `;
    } else if (userData.role === 'tutor') {
      profileHTML += `
        <p><strong>Subject:</strong> <span>${userData.subject || 'N/A'}</span></p>
        <p><strong>Age:</strong> <span>${userData.age || 'N/A'}</span></p>
        <p><strong>Experience:</strong> <span>${userData.experience || 'N/A'} years</span></p>
      `;
    }
    userProfileDiv.innerHTML = profileHTML;
  }
}

// New function to load courses created by a tutor
function loadTutorCourses(tutorId) {
  const tutorCoursesList = document.getElementById('tutorCoursesList');
  if (!tutorCoursesList) return;

  db.collection('courses').where('tutorId', '==', tutorId).orderBy('createdAt', 'desc').get()
    .then(querySnapshot => {
      tutorCoursesList.innerHTML = ''; // Clear existing list
      if (querySnapshot.empty) {
        tutorCoursesList.innerHTML = '<p>You have not created any courses yet.</p>';
        return;
      }
      querySnapshot.forEach(doc => {
        const course = doc.data();
        const courseId = doc.id;
        const courseElement = document.createElement('div');
        courseElement.classList.add('course-card-simple'); // A new simple style for the list
        courseElement.innerHTML = `
          <div class="course-info">
            <h4>${course.title}</h4>
          </div>
          <div class="course-actions">
            <a href="edit-course.html?id=${courseId}" class="btn-action edit-btn">Edit</a>
            <button onclick="deleteCourse('${courseId}', '${course.title}')" class="btn-action delete-btn">Delete</button>
          </div>
        `;
        tutorCoursesList.appendChild(courseElement);
      });
    })
    .catch(error => {
      console.error("Error fetching tutor courses: ", error);
      tutorCoursesList.innerHTML = '<p>Could not load your courses at this time.</p>';
    });
}

// New function to load students enrolled in a tutor's courses
function loadTutorStudents(tutorId) {
  const studentsListContainer = document.getElementById('myStudentsList');
  if (!studentsListContainer) return;

  studentsListContainer.innerHTML = '<p>Loading students...</p>';

  // 1. Get all courses created by the tutor
  db.collection('courses').where('tutorId', '==', tutorId).get()
    .then(async (querySnapshot) => {
      if (querySnapshot.empty) {
        studentsListContainer.innerHTML = '<p>No students have enrolled in your courses yet.</p>';
        return;
      }

      let allStudents = {}; // Use an object to avoid duplicate student entries

      // 2. For each course, get the list of enrolled students
      for (const courseDoc of querySnapshot.docs) {
        const courseData = courseDoc.data();
        if (courseData.enrolledStudents && courseData.enrolledStudents.length > 0) {
          for (const studentId of courseData.enrolledStudents) {
            if (!allStudents[studentId]) { // If we haven't fetched this student yet
              const studentDoc = await db.collection('users').doc(studentId).get();
              if (studentDoc.exists) {
                allStudents[studentId] = studentDoc.data();
              }
            }
          }
        }
      }

      // 3. Display the unique students
      studentsListContainer.innerHTML = '';
      const studentArray = Object.values(allStudents);
      if (studentArray.length === 0) {
        studentsListContainer.innerHTML = '<p>No students have enrolled in your courses yet.</p>';
      } else {
        studentArray.forEach(student => {
          const studentElement = document.createElement('div');
          studentElement.classList.add('course-card-simple'); // Reusing style
          studentElement.innerHTML = `
            <div class="course-info">
              <h4>${student.name}</h4>
              <p style="margin-top: 5px;">Email: ${student.email}</p>
            </div>
          `;
          studentsListContainer.appendChild(studentElement);
        });
      }
    })
    .catch(error => {
      console.error("Error loading tutor students:", error);
      studentsListContainer.innerHTML = '<p>Could not load students at this time.</p>';
    });
}

// New function to create a course
function createCourse(event) {
  event.preventDefault();
  const form = event.target;
  const createButton = form.querySelector('button[type="submit"]');
  const originalButtonText = createButton.innerText;

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to create a course.");
    window.location.href = 'login.html';
    return;
  }

  createButton.disabled = true;
  createButton.innerText = 'Creating...';

  const courseData = {
    title: document.getElementById('courseTitle').value,
    description: document.getElementById('courseDescription').value,
    imageUrl: document.getElementById('courseImage').value,
    category: document.getElementById('courseCategory').value,
    tutorId: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    enrolledStudents: [] // Initialize with an empty array for students
  };

  db.collection('courses').add(courseData)
    .then(() => {
      alert('Course created successfully!');
      window.location.href = 'tutor-dashboard.html';
    })
    .catch(error => {
      alert(`Error: ${error.message}`);
      console.error("Error creating course: ", error);
      createButton.disabled = false;
      createButton.innerText = originalButtonText;
    });
}

// New function to delete a course
function deleteCourse(courseId, courseTitle) {
  if (confirm(`Are you sure you want to delete the course "${courseTitle}"? This action cannot be undone.`)) {
    db.collection('courses').doc(courseId).delete()
      .then(() => {
        alert('Course deleted successfully.');
        // Reload the list of courses for the tutor
        loadTutorCourses(auth.currentUser.uid);
      })
      .catch(error => {
        console.error("Error deleting course: ", error);
        alert('There was an error deleting the course.');
      });
  }
}

// New function to load course data for the edit page
function loadCourseForEdit() {
  const courseId = new URLSearchParams(window.location.search).get('id');
  if (!courseId) {
      alert('No course ID provided.');
      window.location.href = 'tutor-dashboard.html';
      return;
  }

  const form = document.querySelector('form');
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true; // Disable until data is loaded

  db.collection('courses').doc(courseId).get()
      .then(doc => {
          if (doc.exists) {
              const course = doc.data();
              // Check if the current user is the owner
              const user = auth.currentUser;
              if (user && user.uid === course.tutorId) {
                  document.getElementById('courseTitle').value = course.title;
                  document.getElementById('courseDescription').value = course.description;
                  document.getElementById('courseImage').value = course.imageUrl;
                  document.getElementById('courseCategory').value = course.category;
                  submitButton.disabled = false; // Enable form submission
              } else {
                  alert('You do not have permission to edit this course.');
                  window.location.href = 'tutor-dashboard.html';
              }
          } else {
              alert('Course not found.');
              window.location.href = 'tutor-dashboard.html';
          }
      })
      .catch(error => {
          console.error("Error fetching course for edit: ", error);
          alert('Could not load course data.');
          window.location.href = 'tutor-dashboard.html';
      });
}

// New function to update a course
function updateCourse(event) {
  event.preventDefault();
  const courseId = new URLSearchParams(window.location.search).get('id');
  if (!courseId) {
      alert('Error: Course ID is missing.');
      return;
  }

  const form = event.target;
  const updateButton = form.querySelector('button[type="submit"]');
  const originalButtonText = updateButton.innerText;

  updateButton.disabled = true;
  updateButton.innerText = 'Updating...';

  const updatedData = {
      title: document.getElementById('courseTitle').value,
      description: document.getElementById('courseDescription').value,
      imageUrl: document.getElementById('courseImage').value,
      category: document.getElementById('courseCategory').value,
  };

  db.collection('courses').doc(courseId).update(updatedData)
      .then(() => {
          alert('Course updated successfully!');
          window.location.href = 'tutor-dashboard.html';
      })
      .catch(error => {
          alert(`Error: ${error.message}`);
          console.error("Error updating course: ", error);
          updateButton.disabled = false;
          updateButton.innerText = originalButtonText;
      });
}

//Enroll in Course
function enroll(courseId, courseTitle) {
  // 1. Get the currently signed-in user
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first to enroll in a course.");
    window.location.href = "login.html";
    return;
  }
  
  // Visually disable the button immediately to prevent multiple clicks
  const enrollButton = document.querySelector(`.enrollBtn[data-course-id="${courseId}"]`);
  if (enrollButton) {
    enrollButton.innerText = 'Enrolling...';
    enrollButton.disabled = true;
  }

  // 2. Get a reference to the Cloud Function
  const functions = firebase.app().functions('asia-south1'); // Specify the region
  const enrollStudent = functions.httpsCallable('enrollStudentInCourse');

  // 3. Call the function with the required data
  enrollStudent({ courseId: courseId, courseTitle: courseTitle })
    .then((result) => {
      alert(`You have successfully enrolled in "${courseTitle}"!`);
      if (enrollButton) {
        enrollButton.innerText = 'Enrolled';
      }
    })
    .catch((error) => {
      console.error("Error enrolling via Cloud Function: ", error);
      alert(`Enrollment failed: ${error.message}`);
      // Re-enable the button on failure
      if (enrollButton) {
        enrollButton.innerText = 'Enroll';
        enrollButton.disabled = false;
      }
    });
}

//Logout
function logout() {
  auth.signOut().then(() => {
    window.location.href = "../index.html";
  }).catch((error) => {
    console.error("Logout Error:", error);
  });
}

// New function to load all courses for the public courses page
function loadAllCourses() {
  const container = document.getElementById('all-courses-container');
  if (!container) return;

  container.innerHTML = '<p>Loading courses...</p>'; // Show loading message

  auth.onAuthStateChanged(async (user) => {
    let enrolledCourseIds = [];
    if (user) {
      // If user is logged in, get their enrolled courses to disable buttons
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data().courses) {
        enrolledCourseIds = userDoc.data().courses.map(c => c.id);
      }
    }

    // Now fetch all courses
    db.collection('courses').orderBy('createdAt', 'desc').get()
      .then(querySnapshot => {
        container.innerHTML = ''; // Clear loading message
        if (querySnapshot.empty) {
          container.innerHTML = '<p>No courses are available at the moment. Please check back later.</p>';
          return;
        }
        querySnapshot.forEach(doc => {
          const course = doc.data();
          const courseId = doc.id;
          const isEnrolled = enrolledCourseIds.includes(courseId);

          const courseCard = document.createElement('div');
          courseCard.classList.add('course-card');
          courseCard.innerHTML = `
            <img src="${course.imageUrl}" alt="${course.title}">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <button class="btn enrollBtn" data-course-id="${courseId}" data-course-title="${course.title}" ${isEnrolled ? 'disabled' : ''}>
              ${isEnrolled ? 'Enrolled' : 'Enroll'}
            </button>
          `;
          container.appendChild(courseCard);
        });

        // Add event listeners to buttons that are not disabled
        container.querySelectorAll('.enrollBtn:not([disabled])').forEach(button => {
          button.addEventListener('click', (event) => {
            const courseId = event.target.getAttribute('data-course-id');
            const courseTitle = event.target.getAttribute('data-course-title');
            enroll(courseId, courseTitle);
          });
        });
      })
      .catch(error => {
        console.error("Error fetching all courses: ", error);
        container.innerHTML = '<p>Could not load courses due to an error.</p>';
      });
  });
}

// Handle Contact Form Submission
function handleContactSubmit(event) {
  event.preventDefault();
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('contactFormStatus');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerText;

  // Get form data
  const name = document.getElementById('contactName').value;
  const email = document.getElementById('contactEmail').value;
  const message = document.getElementById('contactMessage').value;

  // Disable button and show sending status
  submitButton.disabled = true;
  submitButton.innerText = 'Sending...';
  statusEl.innerText = '';
  statusEl.style.color = '';

  // Save to Firestore
  db.collection('contact_messages').add({
    name: name,
    email: email,
    message: message,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    statusEl.innerText = "Thank you! Your message has been sent.";
    statusEl.style.color = 'green';
    form.reset(); // Clear the form
  })
  .catch((error) => {
    console.error("Error sending message: ", error);
    statusEl.innerText = "Sorry, there was an error. Please try again.";
    statusEl.style.color = 'red';
  })
  .finally(() => { // This block will run after .then() or .catch()
    // Re-enable the button
    submitButton.disabled = false;
    submitButton.innerText = originalButtonText;
  });
}

// Dashboard Panel Switching
function showPanel(panelId) {
  // Hide all content panels
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Deactivate all sidebar links
  document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.classList.remove('active');
  });

  // Show the selected panel
  const panelToShow = document.getElementById(`${panelId}-panel`);
  if (panelToShow) panelToShow.classList.add('active');

  // Activate the clicked sidebar link
  const linkToActivate = document.querySelector(`.sidebar nav a[onclick="showPanel('${panelId}')"]`);
  if (linkToActivate) linkToActivate.classList.add('active');
}

// Attach event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Logic for the public courses page
  if (document.getElementById('all-courses-container')) {
    loadAllCourses();
  }

  // Logic for the dashboard pages
  if (document.body.classList.contains('dashboard-page')) {
      loadDashboard();
  }

  // Logic for the edit course page
  if (window.location.pathname.includes('edit-course.html')) {
      // Make sure user is logged in before trying to load
      auth.onAuthStateChanged(user => {
          if (user) {
              loadCourseForEdit();
          } else {
              alert('You must be logged in to edit a course.');
              window.location.href = 'login.html';
          }
      });
  }
});