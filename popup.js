document.addEventListener("DOMContentLoaded", async function () {
  var enableCheckbox = document.getElementById("enableCheckbox");
  var actionRadios = document.querySelectorAll('input[name="actionRadio"]');
  var intervalInput = document.getElementById("intervalInput");
  var saveButton = document.getElementById("saveButton");
  var statusMessage = document.getElementById("statusMessage");
  var sitesTableBody = document.getElementById("sitesTableBody");

  try {
    // Request initial settings from the background script
    var appData = await getSettings();
    if (typeof appData === "undefined") {
      throw new Error("Settings are undefined");
    }
    if (appData.settings)
      chrome.tabs.query(
        { active: true, currentWindow: true },
        async function (tabs) {
          var tab = tabs[0];
          var url = new URL(tab.url);
          var domain = url.hostname;
          var currentSiteData = appData.settings.filter(
            (x) => x.siteHost == domain
          );
          if (currentSiteData.length > 0) {
            var currentTabSettings = currentSiteData[0];
            enableCheckbox.checked = currentTabSettings.enabled || false;
            intervalInput.value = currentTabSettings.interval || 60;

            Array.from(actionRadios).forEach(function (radio) {
              radio.checked =
                radio.value === (currentTabSettings.action || "Keep Active");
            });
          }
        }
      );
    populateSitesTable(appData.settings || []);
  } catch (error) {
    // Handle error retrieving settings
    console.error(error);
    showMessage(`Error retrieving settings: ${error.message}`, "error");
  }

  saveButton.addEventListener("click", async function () {
    var sitename = "";
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function (tabs) {
        var tab = tabs[0];
        var url = new URL(tab.url);
        var domain = url.hostname;

        var settings = {
          siteHost: domain,
          enabled: enableCheckbox.checked,
          action: document.querySelector('input[name="actionRadio"]:checked')
            .value,
          interval: parseInt(intervalInput.value),
          timerId: 0,
        };

        try {
          const response = await saveSettings(settings);
          if (!response || typeof response.success === "undefined") {
            throw new Error("Error saving settings");
          }

          showMessage(response.message, "success");
          setTimeout(function () {
            clearMessage();
          }, 3000);

          const updatedSettings = await getSettings();
          populateSitesTable(updatedSettings.settings || []);
        } catch (error) {
          console.error(error);
          showMessage(`Error saving settings: ${error.message}`, "error");
        }
      }
    );
  });

  function showMessage(message, className) {
    statusMessage.textContent = message;
    statusMessage.className = className;
  }

  function clearMessage() {
    statusMessage.textContent = "";
    statusMessage.className = "";
  }

  function populateSitesTable(data) {
    sitesTableBody.innerHTML = "";

    data.forEach(function (site) {
      var row = document.createElement("tr");

      var siteCell = document.createElement("td");
      siteCell.textContent = site.siteHost;
      row.appendChild(siteCell);

      var actionCell = document.createElement("td");
      actionCell.textContent = site.action;
      row.appendChild(actionCell);

      var intervalCell = document.createElement("td");
      intervalCell.textContent = site.interval;
      row.appendChild(intervalCell);

      var timerIdCell = document.createElement("td");
      timerIdCell.textContent = site.timerId;
      row.appendChild(timerIdCell);

      var enableIdCell = document.createElement("td");
      enableIdCell.textContent = site.enabled?"Active":"In Active"
      row.appendChild(enableIdCell);

      sitesTableBody.appendChild(row);
    });
  }

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getSettings" }, resolve);
    });
  }

  async function saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "saveSettings", settings }, resolve);
    });
  }
});
