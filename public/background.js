// background.js - Firefox compatible version
const browser = typeof browser !== 'undefined' ? browser : chrome;

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTimer") {
    const { title, message, duration } = request.payload;
    startTimer(title, message, duration, sendResponse);
    return true;
  } else if (request.action === "getTimerStatus") {
    getTimerStatus(sendResponse);
    return true;
  }
});

function startTimer(title, message, duration, sendResponse) {
  browser.alarms.clearAll();

  const startTime = Date.now();
  const endTime = startTime + duration * 1000;

  browser.alarms.create("reminderAlarm", {
    when: endTime,
  });

  const timerData = {
    title,
    message,
    duration,
    startTime,
    endTime,
    isActive: true,
    timeRemaining: duration,
    notificationShown: false,
  };

  browser.storage.local.set({ timerData }).then(() => {
    sendResponse({ status: "Timer started" });
  });
}

function getTimerStatus(sendResponse) {
  browser.storage.local.get(["timerData"]).then((result) => {
    if (result.timerData && result.timerData.isActive) {
      const now = Date.now();
      const timeRemaining = Math.max(
        0,
        Math.floor((result.timerData.endTime - now) / 1000)
      );
      const isActive = timeRemaining > 0;

      const updatedTimerData = {
        ...result.timerData,
        timeRemaining,
        isActive,
      };

      browser.storage.local.set({ timerData: updatedTimerData }).then(() => {
        sendResponse({
          timeRemaining,
          isActive,
          shouldShowNotification:
            !isActive && !result.timerData.notificationShown,
        });
      });
    } else {
      sendResponse({
        timeRemaining: 0,
        isActive: false,
        shouldShowNotification: false,
      });
    }
  });
}

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "reminderAlarm") {
    browser.storage.local.get(["timerData"]).then((result) => {
      if (result.timerData && !result.timerData.notificationShown) {
        showNotification(result.timerData.title, result.timerData.message);
      }
    });
  }
});

function showNotification(title, message) {
  browser.notifications.create({
    type: "basic",
    iconUrl: "icons/bell.png",
    title: title,
    message: message,
    buttons: [
      {
        title: "Got It! 👍",
      },
    ],
  });

  browser.storage.local.get(["timerData"]).then((result) => {
    if (result.timerData) {
      const updatedTimerData = {
        ...result.timerData,
        isActive: false,
        timeRemaining: 0,
        notificationShown: true,
      };
      browser.storage.local.set({ timerData: updatedTimerData });
    }
  });
}

browser.notifications.onButtonClicked.addListener((notificationId) => {
  browser.notifications.clear(notificationId);
});

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(["timerData"]).then((result) => {
    if (result.timerData && result.timerData.isActive) {
      const now = Date.now();
      if (result.timerData.endTime > now) {
        browser.alarms.create("reminderAlarm", {
          when: result.timerData.endTime,
        });
      }
    }
  });
});
