/**
 * Triggers an outward-bound push notification targeting a specific student's token.
 * @param {string} recipientToken - The destination target FCM token pulled from the student record.
 * @param {string} title - Heading parameter title for the notification banner window.
 * @param {string} body - Context text describing the execution state.
 */
export const sendPushNotification = async (recipientToken, title, body) => {
  if (!recipientToken) {
    console.log("Skipping notification: Student has not enabled notifications or registered a token.");
    return;
  }

  try {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'key=YOUR_LEGACY_SERVER_KEY_OR_CLOUD_FUNCTION_ENDPOINT'
      },
      body: JSON.stringify({
        to: recipientToken,
        notification: {
          title: title,
          body: body,
          sound: 'default'
        }
      })
    });
    console.log('Notification packet successfully delivered to messaging queues.');
  } catch (error) {
    console.error('Failed to execute notification dispatch: ', error);
  }
};