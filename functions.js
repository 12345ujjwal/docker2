const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.enrollStudentInCourse = functions.region('asia-south1').https.onCall(async (data, context) => {
  // 1. Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to enroll.');
  }

  const studentId = context.auth.uid;
  const { courseId, courseTitle } = data;

  if (!courseId || !courseTitle) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "courseId" and "courseTitle" arguments.');
  }

  const studentRef = db.collection('users').doc(studentId);
  const courseRef = db.collection('courses').doc(courseId);

  // 2. Run a transaction to update both documents
  return db.runTransaction(async (transaction) => {
    const studentDoc = await transaction.get(studentRef);
    if (!studentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Student profile not found.');
    }

    transaction.update(studentRef, { courses: admin.firestore.FieldValue.arrayUnion({ id: courseId, title: courseTitle }) });
    transaction.update(courseRef, { enrolledStudents: admin.firestore.FieldValue.arrayUnion(studentId) });
  });
});