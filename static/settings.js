
/* =========================
   PARCELMATE SETTINGS
========================= */

// Load saved profile
function loadProfile() {

    const savedProfile = localStorage.getItem("userProfile");

    let profile = {};

    try {
        profile = savedProfile ? JSON.parse(savedProfile) : {};
    } catch (error) {
        console.error("Unable to load profile:", error);
        profile = {};
    }

    document.getElementById("profileName").value =
        profile.name || "";

    document.getElementById("profileEmail").value =
        profile.email || "";

    document.getElementById("profilePhone").value =
        profile.phone || "";

    document.getElementById("notificationPreference").checked =
        profile.notifications !== false;

    updateNotificationStatus();
}


// Save profile
function saveProfile() {

    const name =
        document.getElementById("profileName").value.trim();

    const email =
        document.getElementById("profileEmail").value.trim();

    const phone =
        document.getElementById("profilePhone").value.trim();

    const notifications =
        document.getElementById("notificationPreference").checked;

    if (!name || !email || !phone) {
        alert("Please fill in all profile details.");
        return;
    }
// Validate email
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailPattern.test(email)) {
    alert("Please enter a valid email address.");
    return;
}

// Validate phone number
const phoneDigits = phone.replace(/\D/g, "");

if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    alert("Please enter a valid phone number (10-15 digits).");
    return;
}
    const profile = {
        name: name,
        email: email,
        phone: phone,
        notifications: notifications
    };

    localStorage.setItem(
        "userProfile",
        JSON.stringify(profile)
    );

    document.getElementById("profileMessage").textContent =
        "Profile saved successfully! ✅";

    updateNotificationStatus();
}


// Update notification status
function updateNotificationStatus() {

    const checkbox =
        document.getElementById("notificationPreference");

    const statusText =
        document.getElementById("notificationStatus");

    if (checkbox.checked) {

        statusText.textContent = "Notifications are ON";
        statusText.style.color = "#16a34a";

    } else {

        statusText.textContent = "Notifications are OFF";
        statusText.style.color = "#dc2626";

    }
}


// Initialize Settings
document.addEventListener("DOMContentLoaded", function () {

    loadProfile();

    document.getElementById("notificationPreference")
        .addEventListener("change", updateNotificationStatus);

});
