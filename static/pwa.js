
// ========================================
// 1. REGISTER SERVICE WORKER
// ========================================

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("/service-worker.js")
            .then(function () {
                console.log("ParcelMate Service Worker registered!");
            })
            .catch(function (error) {
                console.error("Service Worker registration failed:", error);
            });
    });
}


// ========================================
// 2. INSTALLATION ELEMENTS
// ========================================

let deferredPrompt;

const installButton = document.getElementById("installAppButton");
const installMessage = document.getElementById("installMessage");


// ========================================
// 3. CHECK IF APP IS ALREADY INSTALLED
// ========================================

function checkAppInstallation() {

    const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (isInstalled) {

        if (installButton) {
            installButton.hidden = true;
        }

        if (installMessage) {
            installMessage.textContent =
                "ParcelMate is already installed successfully!";
        }

        return true;
    }

    return false;
}

checkAppInstallation();


// ========================================
// 4. DETECT INSTALLATION AVAILABILITY
// ========================================

window.addEventListener("beforeinstallprompt", function (event) {

    event.preventDefault();

    deferredPrompt = event;

    if (installButton) {
        installButton.hidden = false;
    }

    if (installMessage) {
        installMessage.textContent =
            "ParcelMate is ready to install!";
    }

});


// ========================================
// 5. INSTALL BUTTON CLICK
// ========================================

if (installButton) {

    installButton.addEventListener("click", async function () {

        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();

        const result = await deferredPrompt.userChoice;

        if (installMessage) {

            installMessage.textContent =
                result.outcome === "accepted"
                    ? "ParcelMate installation accepted!"
                    : "Installation was cancelled.";
        }

        deferredPrompt = null;
        installButton.hidden = true;

    });

}


// ========================================
// 6. DETECT SUCCESSFUL INSTALLATION
// ========================================

window.addEventListener("appinstalled", function () {

    if (installButton) {
        installButton.hidden = true;
    }

    if (installMessage) {
        installMessage.textContent =
            "ParcelMate is installed successfully!";
    }

});
