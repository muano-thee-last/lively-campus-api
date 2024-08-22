/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const express = require("express");
const app = express();

const cors = require("cors");

app.use(cors({origin: true}));

// Routes
app.get("/", (req, res) => {
  res.status(200).send("Hello from Lively Campus");
});

app.get("/hello-world", (req, res) => {
  res.status(200).send("Hello World from Lively Campus");
});

// Create a new event
app.post("/events", async (req, res) => {
  try {
    const {title, description, date, location, organizer} = req.body;
    const eventRef = await admin.firestore().collection("events").add({
      title,
      description,
      date,
      location,
      organizer,
    });
    res.status(201).json({id: eventRef.id, message: "Event created successfully"});
  } catch (error) {
    res.status(500).json({error: "Failed to create event"});
  }
});

// Retrieve all events
app.get("/events", async (req, res) => {
  try {
    const eventsSnapshot = await admin.firestore().collection("events").get();
    const events = eventsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({error: "Failed to retrieve events"});
  }
});

// Get details of a specific event
app.get("/events/:eventId", async (req, res) => {
  try {
    const eventDoc = await admin.firestore().collection("events").doc(req.params.eventId).get();
    if (!eventDoc.exists) {
      res.status(404).json({error: "Event not found"});
    } else {
      res.status(200).json({id: eventDoc.id, ...eventDoc.data()});
    }
  } catch (error) {
    res.status(500).json({error: "Failed to retrieve event"});
  }
});

// Update an event
app.put("/events/:eventId", async (req, res) => {
  try {
    const {title, description, date, location} = req.body;
    await admin.firestore().collection("events").doc(req.params.eventId).update({
      title,
      description,
      date,
      location,
    });
    res.status(200).json({message: "Event updated successfully"});
  } catch (error) {
    res.status(500).json({error: "Failed to update event"});
  }
});

// Delete an event
app.delete("/events/:eventId", async (req, res) => {
  try {
    await admin.firestore().collection("events").doc(req.params.eventId).delete();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({error: "Failed to delete event"});
  }
});

// Get notifications for event changes
app.get("/notifications", async (req, res) => {
  try {
    const notificationsSnapshot = await admin.firestore().collection("notifications").get();
    const notifications = notificationsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({error: "Failed to retrieve notifications"});
  }
});

app.get("/test", (req, res) => {
  const db = admin.firestore();
  const test = db.collection("test");
  test
      .get()
      .then((data) => {
        const testData = [];
        data.forEach((doc) => {
          testData.push(doc.data());
        });
        return res.json(testData);
      })
      .catch((err) => console.error(err));
});

// Export the API to firebase cloud functions
exports.app = functions.https.onRequest(app);
