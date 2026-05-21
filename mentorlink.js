// ============================================================
// MentorLink — Full App JS
// Firebase v9 compat, Realtime DB, Auth
// CRUD: users, mentors, projects, students, bookings
// Fapshi payment / Tawk.to chat
// ============================================================

// ---------- FIREBASE INIT (compat namespace) ----------
const firebaseConfig = {
  apiKey: "AIzaSyBNMY2hoXQEGnp7bHnxxRVAACHjCcU5ObE",
  authDomain: "rgskillbridge.firebaseapp.com",
  projectId: "rgskillbridge",
  storageBucket: "rgskillbridge.firebasestorage.app",
  messagingSenderId: "1044569946706",
  appId: "1:1044569946706:web:6acefd55d6900d98dbbd8b",
  measurementId: "G-3F9KCBW4MD",
};
if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
  firebase.analytics && firebase.analytics();
}

// ---------- Tawk.to Chat Widget ----------
(function () {
  var Tawk_API = Tawk_API || {},
    Tawk_LoadStart = new Date();
  var s1 = document.createElement("script"),
    s0 = document.getElementsByTagName("script")[0];
  s1.async = true;
  s1.src = "https://embed.tawk.to/65f9e7e51ec1082f04d8e7b7/1hpqv7v7g";
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  s0.parentNode.insertBefore(s1, s0);
})();

// ============================================================
// FIREBASE HELPER FUNCTIONS
// ============================================================

/** Current authenticated user (Promise) */
function getCurrentUser() {
  return new Promise(function (resolve) {
    if (typeof firebase === "undefined") return resolve(null);
    firebase.auth().onAuthStateChanged(function (u) { resolve(u); });
  });
}

/** Write to /users/{uid} */
function saveProfileToDB(uid, data) {
  return firebase.database().ref("users/" + uid).set(data);
}

/** Read /users/{uid} once */
function getProfileFromDB(uid) {
  return firebase.database().ref("users/" + uid).once("value");
}

/** Read all users once */
function getAllUsers() {
  return firebase.database().ref("users").once("value");
}

/** Push a new mentor to /mentors/ */
function saveMentorToDB(data) {
  return firebase.database().ref("mentors").push(data);
}

/** Read all mentors once */
function getAllMentors() {
  return firebase.database().ref("mentors").once("value");
}

/** Listen /mentors/ in real time (for mentor page) */
function onMentorsChange(cb) {
  if (typeof firebase === "undefined") return;
  firebase.database().ref("mentors").on("value", function (s) { cb(s.val() || {}); });
}

/** Push a new project to /projects/ */
function saveProjectToDB(data) {
  return firebase.database().ref("projects").push(data);
}

/** Read all projects once */
function getAllProjects() {
  return firebase.database().ref("projects").once("value");
}

/** Update /projects/{key} */
function updateProjectInDB(key, data) {
  return firebase.database().ref("projects/" + key).update(data);
}

/** Delete /projects/{key} */
function deleteProjectFromDB(key) {
  return firebase.database().ref("projects/" + key).remove();
}

/** Push a new student record to /students/ */
function saveStudentToDB(data) {
  return firebase.database().ref("students").push(data);
}

/** Read all students once */
function getAllStudents() {
  return firebase.database().ref("students").once("value");
}

/** Delete /students/{key} */
function deleteStudentFromDB(key) {
  return firebase.database().ref("students/" + key).remove();
}

// ============================================================
// FAPSHI PAYMENT
// ============================================================
const FAPSHI_LINK      = "https://pay.fapshi.com/18869134";
const FAPSHI_LINK_UTM  = "https://pay.fapshi.com/18869134?utm_source=mentorlink";
function payWithFapshi() {
  window.open(FAPSHI_LINK_UTM, "_blank");
}

// ============================================================
// ACCOUNT PAGE
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  if (!window.location.pathname.includes("Account.html")) return;
  if (typeof firebase === "undefined") return;

  var eml     = document.getElementById("profile-email");
  var nameInp = document.getElementById("profile-name");
  var imgInp  = document.getElementById("profile-image");
  var imgPrev = document.getElementById("profile-img-preview");
  var form    = document.getElementById("profile-form");
  if (!form) return;

  // Auth guard
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) { window.location.href = "LogIn.html"; return; }
    if (eml)  eml.value = user.email || "";
    if (nameInp) nameInp.value = user.displayName || "";

    getProfileFromDB(user.uid).then(function (snap) {
      var d = snap.val() || {};
      var ask = document.getElementById("sk-overlay-account");
      if (ask) ask.remove();
      if (nameInp && d.name) nameInp.value = d.name;
      if (d.image && imgPrev) {
        imgPrev.src = d.image;
        imgPrev.style.display = "block";
      }
    });
  });

  // Image preview (base64 via FileReader)
  if (imgInp) {
    imgInp.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (evt) {
        if (imgPrev) {
          imgPrev.src = evt.result;
          imgPrev.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Save profile — image stored as base64 in Firebase Realtime DB
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) return;
      var file = imgInp.files[0];
      if (file) {
        var r = new FileReader();
        r.onload = function (ev) {
          saveProfileToDB(user.uid, {
            name: nameInp.value,
            email: user.email,
            image: ev.result,
            updatedAt: Date.now(),
          }).then(function () { alert("Profile updated!"); });
        };
        r.readAsDataURL(file);
      } else {
        var existingImg = imgPrev ? imgPrev.src : null;
        saveProfileToDB(user.uid, {
          name: nameInp.value,
          email: user.email,
          image: existingImg,
          updatedAt: Date.now(),
        }).then(function () { alert("Profile updated!"); });
      }
    });
      });

      // Remove skeleton overlay when students are loaded
      var ssk = document.getElementById("sk-overlay-students");
      if (ssk) ssk.remove();
    });

    renderStudents();
              studentForm.reset();
              document.querySelectorAll("#stu-role-buttons button").forEach(function (b) { b.classList.remove("active"); });
              document.getElementById("stu-role-student").classList.add("active");
            });
          };
          reader.readAsDataURL(file);
        } else {
          doSave(null).then(function () {
            alert("Profile saved!");
            renderStudents();
            studentForm.reset();
            document.querySelectorAll("#stu-role-buttons button").forEach(function (b) { b.classList.remove("active"); });
            document.getElementById("stu-role-student").classList.add("active");
          });
        }
      });
    });
  }

  // ── Role buttons ──
  document.querySelectorAll("#stu-role-buttons button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#stu-role-buttons button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
    });
  });

  // ── Search ──
  var stuSearch = document.getElementById("stu-search");
  if (stuSearch) stuSearch.addEventListener("input", applyFilters);

  // ── Filter ──
  var stuFilter = document.getElementById("stu-skill-filter");
  if (stuFilter) stuFilter.addEventListener("change", applyFilters);

  function applyFilters() {
    var q    = (stuSearch ? stuSearch.value : "").toLowerCase();
    var filt = (stuFilter ? stuFilter.value : "").toLowerCase();
    document.querySelectorAll("#student-list .card").forEach(function (c) {
      var name  = (c.getAttribute("data-name")  || "").toLowerCase();
      var skill = (c.getAttribute("data-skill") || "").toLowerCase();
      var match = name.includes(q) || skill.includes(q);
      var fOk   = !filt || skill.includes(filt);
      c.style.display = match && fOk ? "" : "none";
    });
  }

  // ── Render students ──
  function renderStudents() {
    getAllStudents().then(function (snap) {
      var data  = snap.val() || {};
      var keys  = Object.keys(data);
      studentGrid.innerHTML = "";

      if (!keys.length) {
        studentGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#aaa"><i class="fa fa-graduation-cap" style="font-size:3rem;display:block;margin-bottom:1rem"></i><p>No students registered yet.</p></div>';
        return;
      }

      keys.forEach(function (key) {
        var s = data[key];
        var c = document.createElement("div");
        c.className = "card";
        c.setAttribute("data-name",  (s.name  || "").toLowerCase());
        c.setAttribute("data-skill", (s.skill || "").toLowerCase());
        var imgTag = s.image
          ? '<img src="' + s.image + '" alt="' + (s.name||'') + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 10px;display:block;border:3px solid #e0e7ff">'
          : '<div style="width:80px;height:80px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#94a3b8;margin:0 auto 10px;font-weight:700">' + (s.name||'?').charAt(0).toUpperCase() + '</div>';

        var levelColor = s.level === "beginner"   ? "#059669"
                       : s.level === "intermediate" ? "#2563eb"
                       : s.level === "advanced"     ? "#d97706"
                       : "#64748b";

        c.innerHTML =
          '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:.3rem">' +
          imgTag +
          '<h3 style="font-size:1rem;font-weight:700;color:#1e293b">' + (s.name || "Anonymous") + "</h3>" +
          '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:.72rem;font-weight:700;background:#f1f5f9;color:' + levelColor + '">' + (s.level || "student") + "</span>" +
          (s.skill ? '<p style="font-size:.82rem;color:#4f46e5;font-weight:600"><i class="fa fa-code"></i> ' + s.skill + "</p>" : "") +
          (s.goal  ? '<p style="font-size:.8rem;color:#64748b;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + s.goal + "</p>" : "") +
          '<div style="display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap;justify-content:center">' +
          '<button class="view-stu-btn" data-key="' + key + '" style="padding:5px 14px;border-radius:8px;border:1.5px solid #4f46e5;background:#4f46e5;color:#fff;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit">Connect</button>' +
          "</div>" +
          "</div>";
        studentGrid.appendChild(c);
      });

      // Connect button → opens mentor contact (placeholder)
      document.querySelectorAll(".view-stu-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-key");
          var s   = data[key];
          alert("Connect with " + (s.name || "student") + "\n\nEmail: " + (s.email || "") + "\nSkill: " + (s.skill || "n/a") + "\nGoal: " + (s.goal || "n/a"));
        });
      });
    });
  }

  renderStudents();
});

// ============================================================
// SIGNUP
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  var sf = document.querySelector(".right-section form");
  if (sf && window.location.pathname.includes("signupgageGE.html")) {
    sf.addEventListener("submit", function (e) {
      e.preventDefault();
      var inputs = sf.querySelectorAll("input");
      var name        = inputs[0].value.trim();
      var email       = inputs[1].value.trim();
      var phone       = inputs[2].value.trim();
      var password    = inputs[3].value;
      var confirmPwd  = inputs[4].value;

      if (!name || !email || !password) { alert("Name, email and password are required."); return; }
      if (password !== confirmPwd)         { alert("Passwords do not match."); return; }
      if (password.length < 6)             { alert("Password must be at least 6 characters."); return; }

      if (typeof firebase === "undefined") { alert("Firebase not loaded."); return; }

      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          var uid  = cred.user.uid;
          var role = Array.from(sf.parentElement.querySelectorAll(".role-buttons button"))
            .find(function (b) { return b.classList.contains("active"); });
          var isMentor = role && role.id === "role-mentor";

          var profile = {
            name, email, phone,
            role   : isMentor ? "mentor" : (role && role.id === "role-org" ? "organization" : "student"),
            image  : null,
            createdAt : Date.now(),
          };

          saveProfileToDB(uid, profile);

          if (isMentor) {
            return saveMentorToDB({
              uid,
              name,
              email,
              role  : document.getElementById("reg-role-title") ? document.getElementById("reg-role-title").value : name,
              skill : document.getElementById("reg-skill")       ? document.getElementById("reg-skill").value       : "",
              price : document.getElementById("reg-rate")        ? (document.getElementById("reg-rate").value + " XAF/hour") : "",
              rating: "5.0",
              image : null,
              createdAt : Date.now(),
            }).then(function () { return profile; });
          }
          return profile;
        })
        .then(function () {
          alert("Signup successful! Please log in.");
          window.location.href = "LogIn.html";
        })
        .catch(function (err) {
          alert("Signup failed: " + err.message);
        });
    });
  }

  // Role toggle buttons
  document.querySelectorAll(".role-buttons button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".role-buttons button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      var mentorFields = document.getElementById("mentor-fields");
      if (mentorFields) mentorFields.style.display = b.id === "role-mentor" ? "block" : "none";
    });
  });
});

// ============================================================
// LOGIN
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  if (!window.location.pathname.includes("LogIn.html")) return;
  var frm = document.querySelector("form");
  if (!frm) return;

  frm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("log-email") ? document.getElementById("log-email").value : "";
    var pass  = document.getElementById("log-pass")  ? document.getElementById("log-pass").value  : "";
    if (!email || !pass) { alert("Please fill in all fields."); return; }

    if (typeof firebase === "undefined") { alert("Firebase not loaded."); return; }

    firebase.auth().signInWithEmailAndPassword(email, pass)
      .then(function (cred) {
        // remove in case of cached page
        var lsk = document.getElementById("sk-overlay-login");
        if(lsk) lsk.remove();
        // ensure user record exists in DB
        return getProfileFromDB(cred.user.uid);
      })
      .then(function (snap) {
        if (!snap.val()) {
          return saveProfileToDB(snap.ref.parent.key, { email: email, createdAt: Date.now() });
        }
      })
      .then(function () {
        alert("Login successful!");
        window.location.href = "dashboard-1.html";
      })
      .catch(function (err) {
        alert("Login failed: " + err.message);
      });
  });

  // Global logout handler
  document.querySelectorAll(".logout").forEach(function (el) {
    el.addEventListener("click", function () {
      if (typeof firebase !== "undefined") {
        firebase.auth().signOut().then(function () { window.location.href = "LogIn.html"; });
      }
    });
  });
});

// ============================================================
// DASHBOARD — live data from Firebase
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  if (!window.location.pathname.includes("dashboard-1.html")) return;

  if (typeof firebase !== "undefined") {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = "LogIn.html"; return; }

      // Header - personalize with full name, then fall back to email if that's blank
      var welcomeH1 = document.querySelector(".main h1");
      if (welcomeH1) {
      getProfileFromDB(user.uid).then(function (snap) {
        var d = snap.val() || {};

        // profile initials + role in top-nav
        var initEl = document.getElementById("dash-profile-initial");
        if (initEl && d.name) initEl.textContent = d.name.charAt(0).toUpperCase();

        var nameEl = document.getElementById("dash-profile-name");
        if (nameEl) nameEl.textContent = d.name || user.email;

        var roleP = document.getElementById("dash-profile-role");
        if (roleP) roleP.textContent = d.role || "Member";

        // ── Project count ──
        getAllProjects().then(function (snap) {
          var data = snap.val() || {};
          var myKeys = user.uid ? Object.keys(data).filter(function (k) { return data[k].createdBy === user.uid; }) : Object.keys(data);
          var pct  = myKeys.length > 0 ? Math.min(100, myKeys.length * 20) : 0;
          var pctEl  = document.getElementById("dash-projects-pct");
          if (pctEl)  pctEl.textContent = pct + "%";
          var fprog  = document.getElementById("fprogress");
          if (fprog) fprog.value  = pct;
        });

        // ── Mentorships count ──
        getAllMentors().then(function (ms) {
          var cntEl = document.getElementById("dash-mentorships-count");
          if (cntEl) cntEl.textContent = Object.keys(ms.val() || {}).length;
        });

        // ── Certificates count ──
        getAllUsers().then(function (us) {
          var cntEl = document.getElementById("dash-cert-count");
          if (cntEl) cntEl.textContent = Object.keys(us.val() || {}).length;
        });
      });
      }

      // Live stats from Firebase
      getProfileFromDB(user.uid).then(function (snap) {
        var d = snap.val() || {};

        // profile initials + role in top-nav
        var initEl = document.getElementById("dash-profile-initial");
        if (initEl && d.name) initEl.textContent = d.name.charAt(0).toUpperCase();

        var roleEl = document.getElementById("dash-profile-name");
        if (roleEl) roleEl.textContent = d.name || user.email;

        var roleP = document.getElementById("dash-profile-role");
        if (roleP) roleP.textContent = d.role || "Member";

        // ── Project count ──
        getAllProjects().then(function (s) {
          var projData = s.val() || {};
          var myKeys   = user.uid ? Object.keys(projData).filter(function (k) { return projData[k].createdBy === user.uid; }) : Object.keys(projData);
          var pct      = myKeys.length > 0 ? Math.min(100, (myKeys.length * 18)) : 0;
          var pctEl    = document.getElementById("dash-projects-pct");
          if (pctEl) pctEl.textContent = pct + "%";
          document.getElementById("fprogress").value = pct;
        });

        // ── Mentorships count ──
        getAllMentors().then(function (ms) {
          var cntEl = document.getElementById("dash-mentorships-count");
          if (cntEl) cntEl.textContent = Object.keys(ms.val() || {}).length;
        });

        // ── Certificates count ──
        getAllUsers().then(function (us) {
          var cntEl = document.getElementById("dash-cert-count");
          if (cntEl) cntEl.textContent = Object.keys(us.val() || {}).length;
        });
      });
    });
  }

  // Logout
  document.querySelectorAll(".logout").forEach(function (el) {
    el.addEventListener("click", function () {
      if (typeof firebase !== "undefined") {
        firebase.auth().signOut().then(function () { window.location.href = "LogIn.html"; });
      }
    });
  });
});

// ============================================================
// NAV ACTIVE STATE
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  var page = window.location.pathname.split("/").pop() || "Landing.html";
  document.querySelectorAll("nav a").forEach(function (a) {
    var h = a.getAttribute("href") || "";
    if (h.endsWith(page) || (page === "index.html" && h === "Landing.html")) {
      a.style.color = "#4f46e5"; a.style.fontWeight = "600";
    }
  });
});

// ============================================================
// GLOBAL: hide all skeleton overlays on the page
// ============================================================
function hideSkeletons() {
  document.querySelectorAll("[id^='sk-overlay-'], [id^='sk-']").forEach(function (el) {
    if (el && el.remove) el.remove();
  });
}
