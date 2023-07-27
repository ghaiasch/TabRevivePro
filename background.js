// Default settings
const defaultSettings = {
  enabled: false,
  action: "Keep Active",
  interval: 60,
};
appData = {
  siteSettings: [],
};
// Refresh or Keep Active enabled sites at specified intervals
function refreshOrScrollSites(sites) {
  sites.forEach(function (site) {
    if (site.timerId != 0) {
      clearInterval(site.timerId);
      site.timerId = 0;
    }
    if (site.enabled) {
      console.log(site.siteHost + " is enabled for " + site.action);
      var isDiscardableTab = site.action === "Keep Active" ? false : true;
      updateChromeTabsDiscardStatus(isDiscardableTab, site.siteHost);
      if (site.action === "Refresh") {
        site.timerId = setInterval(function () {
          reloadChromeTabByHostname(site.siteHost);
        }, site.interval * 1000);
      }
    } else {
      updateChromeTabsDiscardStatus(true, site.siteHost);
    }
  });
  chrome.storage.local.set({ settings: sites }, function () {});
}

function reloadChromeTabByHostname(hostName) {
  var query = "*://" + hostName + "/*";
  chrome.tabs.query({ url: query }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.tabs.reload(tab.id);
    });
  });
}

function updateChromeTabsDiscardStatus(isDiscardable, hostName) {
  var query = "*://" + hostName + "/*";
  chrome.tabs.query({ url: query }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.tabs.update(tab.id, { autoDiscardable: isDiscardable });
    });
  });
}

// Retrieve settings from storage
function getSettings(callback) {
  chrome.storage.local.get(
    { settings: this.appData.siteSettings },
    function (data) {
      callback(data);
    }
  );
}

// Save settings to storage
function saveSettings(settings, callback) {
  this.appData.siteSettings = [];
  getSettings(function (data) {
    if (data && data.settings) {
      var oldData = data.settings.find((x) => x.siteHost == settings.siteHost);
      if (oldData != undefined) {
        var oldTimerId = oldData.timerId;
        settings.timerId = oldTimerId;
        this.appData.siteSettings = data.settings.filter(
          (x) => x.siteHost != settings.siteHost
        );
      } else {
        this.appData.siteSettings = data.settings;
      }
      this.appData.siteSettings.push(settings);
    } else {
      this.appData.siteSettings.push(settings);
    }

    chrome.storage.local.set(
      { settings: this.appData.siteSettings },
      function () {
        refreshOrScrollSites(this.appData.siteSettings || []);
        callback({ success: true, message: "Settings saved successfully" });
      }
    );
  });
}

// Message handler
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "saveSettings") {
    saveSettings(request.settings, sendResponse);
    return true; // Indicates the response will be sent asynchronously
  } else if (request.action === "getSettings") {
    getSettings(sendResponse);
    return true; // Indicates the response will be sent asynchronously
  }
});

// Initialize settings on extension installation
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    // Need to to on install..
  }
});
