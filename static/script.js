
/* ========================================
   1. INITIAL SETUP
======================================== */

// Apply saved theme
const savedParcelMateTheme =
    localStorage.getItem("parcelMateTheme") || "light";

document.body.classList.toggle(
    "dark-theme",
    savedParcelMateTheme === "dark"
);

// Load parcels from Flask
let parcels = Array.isArray(databaseParcels)
    ? [...databaseParcels]
    : [];

let editingParcelId = null;
let showUpcomingOnly = false;

// HTML elements
const parcelFormSection = document.getElementById("parcelForm");
const parcelForm = document.getElementById("parcelFormDetails");
const submitButton = parcelForm.querySelector('button[type="submit"]');

const parcelFilter = document.getElementById("parcelFilter");
const parcelSearch = document.getElementById("parcelSearch");
const parcelSort = document.getElementById("parcelSort");
const parcelList = document.getElementById("parcelList");


// ========================================
// 2. HELPER FUNCTIONS
// ========================================

function getLocalDateString() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getSavedData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || {};
    } catch (error) {
        console.error(`Could not read ${key}:`, error);
        return {};
    }
}


// ========================================
// 3. SHOW OR HIDE PARCEL FORM
// ========================================

function showParcelForm() {
    parcelFormSection.style.display =
        parcelFormSection.style.display === "block"
            ? "none"
            : "block";
}


// ========================================
// 4. BROWSER NOTIFICATIONS
// ========================================

function enableNotifications() {
    if (!("Notification" in window)) {
        alert("Your browser does not support notifications.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notifications enabled successfully! 🔔");
            checkDeliveryReminders();
        } else {
            alert("Notification permission was not granted.");
        }
    });
}


// ========================================
// 5. ADD OR UPDATE PARCEL
// ========================================

parcelForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(parcelForm);
    const isEditing = editingParcelId !== null;

    const url = isEditing
        ? `/update-parcel/${editingParcelId}`
        : "/add-parcel";

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Unable to save parcel.");
            return;
        }

        if (!result.parcel) {
            alert("Parcel saved, but updated data was not received.");
            return;
        }

        if (isEditing) {
            const index = parcels.findIndex(
                parcel => parcel.id === editingParcelId
            );

            if (index !== -1) {
                parcels[index] = result.parcel;
            }
        } else {
            parcels.unshift(result.parcel);
        }

        alert(result.message || "Parcel saved successfully! ✅");

        parcelForm.reset();
        parcelFormSection.style.display = "none";

        editingParcelId = null;
        submitButton.textContent = "Add Parcel";

        showUpcomingOnly = false;
        parcelSearch.value = "";
        parcelFilter.value = "all";

        displayParcels();

    } catch (error) {
        console.error("Parcel save error:", error);
        alert("Server connection error.");
    }
});


// ========================================
// 6. VACATION MODE
// ========================================

const vacationToggle = document.getElementById("vacationToggle");
const vacationDetails = document.getElementById("vacationDetails");
const vacationMessage = document.getElementById("vacationMessage");

function loadVacationSettings() {
    const settings = getSavedData("vacationSettings");

    vacationToggle.checked = settings.enabled || false;

    document.getElementById("vacationStart").value =
        settings.startDate || "";

    document.getElementById("vacationEnd").value =
        settings.endDate || "";

    document.getElementById("vacationInstruction").value =
        settings.instruction || "";

    vacationDetails.style.display =
        vacationToggle.checked ? "block" : "none";

    updateVacationMessage();
}

vacationToggle.addEventListener("change", function () {
    vacationDetails.style.display =
        vacationToggle.checked ? "block" : "none";

    updateVacationMessage();
});

function saveVacationSettings() {
    const startDate = document.getElementById("vacationStart").value;
    const endDate = document.getElementById("vacationEnd").value;

    const instruction =
        document.getElementById("vacationInstruction").value.trim();

    if (vacationToggle.checked && (!startDate || !endDate)) {
        alert("Please select both departure and return dates.");
        return;
    }

    if (startDate && endDate && endDate < startDate) {
        alert("Return date cannot be before departure date.");
        return;
    }

    const settings = {
        enabled: vacationToggle.checked,
        startDate,
        endDate,
        instruction
    };

    localStorage.setItem(
        "vacationSettings",
        JSON.stringify(settings)
    );

    updateVacationMessage();
    alert("Vacation settings saved successfully! 🏖️");
}

function updateVacationMessage() {
    const settings = getSavedData("vacationSettings");

    if (settings.enabled) {
        vacationMessage.textContent =
            `Vacation Mode is ON: ${settings.startDate} to ${settings.endDate}`;
    } else {
        vacationMessage.textContent = "Vacation Mode is OFF.";
    }
}

loadVacationSettings();


// ========================================
// 7. DASHBOARD COUNTS
// ========================================

function updateDashboard() {
    const today = getLocalDateString();

    document.getElementById("totalParcels").textContent =
        parcels.length;

    document.getElementById("upcomingDeliveries").textContent =
        parcels.filter(parcel =>
            parcel.deliveryDate >= today &&
            parcel.parcelStatus !== "Delivered"
        ).length;

    document.getElementById("inTransitCount").textContent =
        parcels.filter(parcel =>
            parcel.parcelStatus === "In Transit"
        ).length;

    document.getElementById("outForDeliveryCount").textContent =
        parcels.filter(parcel =>
            parcel.parcelStatus === "Out for Delivery"
        ).length;

    document.getElementById("deliveredCount").textContent =
        parcels.filter(parcel =>
            parcel.parcelStatus === "Delivered"
        ).length;
}


// ========================================
// 8. OVERDUE DELIVERY ALERT
// ========================================

function updateOverdueAlert() {
    const today = getLocalDateString();

    const overdueParcels = parcels.filter(parcel =>
        parcel.deliveryDate < today &&
        parcel.parcelStatus !== "Delivered"
    );

    const overdueAlert = document.getElementById("overdueAlert");
    const overdueMessage = document.getElementById("overdueMessage");

    if (overdueParcels.length > 0) {
        overdueAlert.style.display = "block";

        overdueMessage.textContent =
            `You have ${overdueParcels.length} overdue parcel(s).`;
    } else {
        overdueAlert.style.display = "none";
    }
}


// ========================================
// 9. DELIVERY REMINDERS
// ========================================

function checkDeliveryReminders() {
    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    const profile = getSavedData("userProfile");

    if (profile.notifications === false) {
        return;
    }

    const today = getLocalDateString();

    parcels.forEach(parcel => {
        if (
            parcel.deliveryDate === today &&
            parcel.parcelStatus !== "Delivered"
        ) {
            const notificationKey =
                `reminded_${parcel.trackingId}_${today}`;

            if (!localStorage.getItem(notificationKey)) {
                new Notification("📦 ParcelMate Delivery Reminder", {
                    body: `Your ${parcel.courierName} parcel (${parcel.trackingId}) is expected today!`
                });

                localStorage.setItem(notificationKey, "true");
            }
        }
    });
}


// ========================================
// 10. DELIVERY TIMELINE
// ========================================

function createTimeline(parcelStatus) {
    const steps = [
        "Parcel Added",
        "In Transit",
        "Out for Delivery",
        "Delivered"
    ];

    const statusOrder = {
        "In Transit": 1,
        "Out for Delivery": 2,
        "Delivered": 3
    };

    const currentStep = statusOrder[parcelStatus] || 0;

    const timeline = document.createElement("div");
    timeline.className = "parcel-timeline";

    steps.forEach((step, index) => {
        const stepElement = document.createElement("div");
        stepElement.className = "timeline-step";

        if (index < currentStep) {
            stepElement.classList.add("completed");
        } else if (index === currentStep) {
            stepElement.classList.add("current");
        }

        const dot = document.createElement("div");
        dot.className = "timeline-dot";

        const label = document.createElement("span");
        label.className = "timeline-label";
        label.textContent = step;

        stepElement.appendChild(dot);
        stepElement.appendChild(label);
        timeline.appendChild(stepElement);
    });

    return timeline;
}


// ========================================
// 11. DISPLAY PARCELS
// ========================================

function displayParcels() {
    updateDashboard();
    updateOverdueAlert();
    checkDeliveryReminders();

    const searchText = parcelSearch.value.toLowerCase().trim();
    const selectedStatus = parcelFilter.value;
    const sortValue = parcelSort.value;

    let filteredParcels = parcels
        .map((parcel, index) => ({
            ...parcel,
            originalIndex: index
        }))
        .filter(parcel => {
            const trackingId =
                String(parcel.trackingId || "").toLowerCase();

            const courierName =
                String(parcel.courierName || "").toLowerCase();

            const matchesSearch =
                trackingId.includes(searchText) ||
                courierName.includes(searchText);

            const matchesStatus =
                selectedStatus === "all" ||
                parcel.parcelStatus === selectedStatus;

            const today = getLocalDateString();

            const matchesUpcoming =
                !showUpcomingOnly ||
                (
                    parcel.deliveryDate >= today &&
                    parcel.parcelStatus !== "Delivered"
                );

            return matchesSearch && matchesStatus && matchesUpcoming;
        });

    if (sortValue === "earliest") {
        filteredParcels.sort((a, b) =>
            a.deliveryDate.localeCompare(b.deliveryDate)
        );
    } else if (sortValue === "latest") {
        filteredParcels.sort((a, b) =>
            b.deliveryDate.localeCompare(a.deliveryDate)
        );
    }

    parcelList.innerHTML = "";

    if (filteredParcels.length === 0) {
        parcelList.textContent = "No parcels found.";
        parcelList.className = "empty-message";
        return;
    }

    parcelList.className = "";

    filteredParcels.forEach(parcel => {
        const card = document.createElement("div");
        card.className = "parcel-card";

        const heading = document.createElement("h3");
        heading.textContent = parcel.courierName || "Unknown Courier";
        card.appendChild(heading);

        const infoGrid = document.createElement("div");
        infoGrid.className = "parcel-info-grid";

        function addInfo(label, value) {
            const item = document.createElement("div");
            item.className = "parcel-info-item";

            const infoLabel = document.createElement("span");
            infoLabel.className = "info-label";
            infoLabel.textContent = label;

            const infoValue = document.createElement("span");
            infoValue.className = "info-value";
            infoValue.textContent = value || "Not available";

            item.appendChild(infoLabel);
            item.appendChild(infoValue);
            infoGrid.appendChild(item);
        }

        addInfo("TRACKING ID", parcel.trackingId);
        addInfo("DELIVERY DATE", parcel.deliveryDate);
        addInfo("DELIVERY ADDRESS", parcel.address);

        card.appendChild(infoGrid);

        const status = document.createElement("p");
        status.textContent = `Status: ${parcel.parcelStatus}`;

        status.className =
            "status-badge " +
            String(parcel.parcelStatus || "")
                .toLowerCase()
                .replaceAll(" ", "-");

        card.appendChild(status);

        const today = getLocalDateString();

        if (
            parcel.deliveryDate < today &&
            parcel.parcelStatus !== "Delivered"
        ) {
            const overdueBadge = document.createElement("span");
            overdueBadge.className = "overdue-badge";
            overdueBadge.textContent = "⚠️ Overdue";
            card.appendChild(overdueBadge);
        }

        card.appendChild(createTimeline(parcel.parcelStatus));

        const actions = document.createElement("div");
        actions.className = "parcel-actions";

        const copyButton = document.createElement("button");
        copyButton.textContent = "Copy ID";

        copyButton.addEventListener("click", () => {
            navigator.clipboard.writeText(parcel.trackingId)
                .then(() => alert("Tracking ID copied!"))
                .catch(() => alert("Unable to copy Tracking ID."));
        });

        const viewButton = document.createElement("button");
        viewButton.textContent = "View Details";

        viewButton.addEventListener("click", () => {
            viewDetails(parcel.originalIndex);
        });

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editParcel(parcel.originalIndex);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteParcel(parcel.originalIndex);
        });

        actions.appendChild(copyButton);
        actions.appendChild(viewButton);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(actions);
        parcelList.appendChild(card);
    });
}


// ========================================
// 12. EDIT PARCEL
// ========================================

function editParcel(index) {
    const parcel = parcels[index];

    if (!parcel) {
        alert("Parcel not found.");
        return;
    }

    document.getElementById("trackingId").value =
        parcel.trackingId;

    document.getElementById("courierName").value =
        parcel.courierName;

    document.getElementById("deliveryDate").value =
        parcel.deliveryDate;

    document.getElementById("deliveryAddress").value =
        parcel.address;

    document.getElementById("parcelStatus").value =
        parcel.parcelStatus;

    editingParcelId = parcel.id;

    submitButton.textContent = "Update Parcel";
    parcelFormSection.style.display = "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ========================================
// 13. DELETE PARCEL
// ========================================

async function deleteParcel(index) {
    const parcel = parcels[index];

    if (!parcel) {
        alert("Parcel not found.");
        return;
    }

    const confirmation = confirm(
        "Are you sure you want to delete this parcel?"
    );

    if (!confirmation) {
        return;
    }

    try {
        const response = await fetch(
            `/delete-parcel/${parcel.id}`,
            { method: "POST" }
        );

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Unable to delete parcel.");
            return;
        }

        parcels.splice(index, 1);

        alert(result.message || "Parcel deleted successfully!");

        displayParcels();

    } catch (error) {
        console.error("Delete error:", error);
        alert("Server connection error.");
    }
}


// ========================================
// 14. EXPORT PARCELS TO CSV
// ========================================

function exportParcels() {
    if (parcels.length === 0) {
        alert("No parcels available to export.");
        return;
    }

    const headers = [
        "Tracking ID",
        "Courier",
        "Delivery Date",
        "Address",
        "Status"
    ];

    const rows = parcels.map(parcel => [
        parcel.trackingId,
        parcel.courierName,
        parcel.deliveryDate,
        parcel.address,
        parcel.parcelStatus
    ]);

    const csvContent = [headers, ...rows]
        .map(row =>
            row.map(value =>
                `"${String(value ?? "").replace(/"/g, '""')}"`
            ).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ParcelMate_Parcels.csv";
    link.click();

    URL.revokeObjectURL(url);
}


// ========================================
// 15. VIEW PARCEL DETAILS
// ========================================

function viewDetails(index) {
    const parcel = parcels[index];

    if (!parcel) {
        alert("Parcel not found.");
        return;
    }

    document.getElementById("detailTrackingId").textContent =
        parcel.trackingId;

    document.getElementById("detailCourier").textContent =
        parcel.courierName;

    document.getElementById("detailDate").textContent =
        parcel.deliveryDate;

    document.getElementById("detailAddress").textContent =
        parcel.address;

    document.getElementById("detailStatus").textContent =
        parcel.parcelStatus;

    document.getElementById("detailsModal").style.display = "flex";
}

function closeDetails() {
    document.getElementById("detailsModal").style.display = "none";
}

document.getElementById("detailsModal").addEventListener(
    "click",
    function (event) {
        if (event.target === this) {
            closeDetails();
        }
    }
);


// ========================================
// 16. SEARCH, FILTER AND SORT
// ========================================

parcelFilter.addEventListener("change", displayParcels);
parcelSearch.addEventListener("input", displayParcels);
parcelSort.addEventListener("change", displayParcels);


// ========================================
// 17. DASHBOARD CARD ACTIONS
// ========================================

function showAllParcels() {
    showUpcomingOnly = false;

    parcelSearch.value = "";
    parcelFilter.value = "all";
    parcelSort.value = "earliest";

    displayParcels();

    parcelList.scrollIntoView({
        behavior: "smooth"
    });
}

function filterParcelsByStatus(status) {
    showUpcomingOnly = false;

    parcelSearch.value = "";
    parcelFilter.value = status;

    displayParcels();

    parcelList.scrollIntoView({
        behavior: "smooth"
    });
}

function showUpcomingDeliveries() {
    showUpcomingOnly = true;

    parcelSearch.value = "";
    parcelFilter.value = "all";

    displayParcels();

    parcelList.scrollIntoView({
        behavior: "smooth"
    });
}


// ========================================
// 18. PREVENT PAST DELIVERY DATES
// ========================================

const deliveryDateInput =
    document.getElementById("deliveryDate");

deliveryDateInput.min = getLocalDateString();


// ========================================
// 19. INITIAL PAGE DISPLAY
// ========================================

displayParcels();

