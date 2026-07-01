import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * Requests explicit user permission to send device browser alerts, 
 * generates an FCM token, and saves it to the student's Firestore profile record.
 * @param {string} studentId - The unique authenticated ID reference string of the active student.
 */
export const requestNotificationPermission = async (studentId) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging();
      
      // Request standard FCM Web Push credential pairing keys (generate this from your Firebase Console)
      const currentToken = await getToken(messaging, { 
        vapidKey: 'YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE_CONSOLE' 
      });

      if (currentToken) {
        // Save the token inside the student's data collection document so you can target them later
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
        await updateDoc(studentRef, {
          fcmToken: currentToken,
          notificationsEnabled: true
        });
        console.log('FCM Token securely paired to student profile database layer.');
      } else {
        console.warn('No registration token available. Check your security rules/credentials configuration.');
      }
    } else {
      console.warn('Notification permission was blocked or denied by the client user agent.');
    }
  } catch (error) {
    console.error('An error occurred while provisioning push credentials: ', error);
  }
};

/**
 * Sets up an active listener to intercept and show notification alerts 
 * while the student actively has the app tab open in the foreground.
 */
export const listenToForegroundMessages = () => {
  const messaging = getMessaging();
  onMessage(messaging, (payload) => {
    console.log('Foreground notification intercepted: ', payload);
    // You can choose to trigger a visual browser alert or custom toast component here
    alert(`${payload.notification.title}\n${payload.notification.body}`);
  });
};