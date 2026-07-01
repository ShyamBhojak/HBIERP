importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Verbatim configuration parameters matching your project initialization values
firebase.initializeApp({
    apiKey: "AIzaSyDo2VvRJcBd4PCmrUXIc8Sn2L2OjBTXtvM",
  authDomain: "hbinstitute-crm.firebaseapp.com",
  projectId: "hbinstitute-crm",
  storageBucket: "hbinstitute-crm.firebasestorage.app",
  messagingSenderId: "567509853695",
  appId: "1:567509853695:web:7243bfd1b44a1a9917b3ca",
  measurementId: "G-Z5VFB5SKNN"
});

const messaging = firebase.messaging();

// Handle background messaging notifications implicitly
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background Message Received: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Replace with your standard application dashboard icon path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});