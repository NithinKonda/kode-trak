import * as vscode from "vscode";
import { MongoClient } from "mongodb";
require("dotenv").config();

const mongoUri = process.env.MONGO_URI;

const dbName = process.env.DB_NAME || "vsCodeUsageDB";
const usageCollectionName = "usage_log";
const fileExtensionCollectionName = "file_extension_time";
const activityCollectionName = "file_activity_log";

let startTime: Date | null = null;
let fileStartTimes: Map<string, Date> = new Map();
let linesAdded: number = 0;
let linesDeleted: number = 0;
let wordsAdded: number = 0;
let wordsDeleted: number = 0;
let hasLogged = false;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vs-code-usage-tracker" is now active!');

  startTime = new Date();
  console.log(`VS Code opened at: ${startTime}`);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      const extension = getFileExtension(doc.fileName);
      if (extension) {
        console.log(`Opened file: ${doc.fileName} (Extension: ${extension})`);
        fileStartTimes.set(extension, new Date());
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const extension = getFileExtension(doc.fileName);
      if (extension) {
        const startTime = fileStartTimes.get(extension);
        if (startTime) {
          const endTime = new Date();
          const duration = (endTime.getTime() - startTime.getTime()) / 1000;
          console.log(
            `Closed file: ${doc.fileName} (Extension: ${extension}), Duration: ${duration} seconds`
          );

          fileStartTimes.delete(extension);
          logFileExtensionTimeToMongo(extension, duration);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const document = event.document;
      const changes = event.contentChanges;

      changes.forEach((change) => {
        const addedLines = (change.text.match(/\n/g) || []).length;
        const deletedLines =
          change.rangeLength > 0
            ? (change.rangeLength - change.text.length) / 2
            : 0;
        linesAdded += addedLines;
        linesDeleted += deletedLines;

        const addedWords = (change.text.match(/\w+/g) || []).length;
        const deletedWords =
          change.rangeLength > 0
            ? change.text.split(/\s+/).length -
              change.text.replace(/\s+/g, "").length
            : 0;
        wordsAdded += addedWords;
        wordsDeleted += deletedWords;

        console.log(
          `Lines added: ${addedLines}, Lines deleted: ${deletedLines}`
        );
        console.log(
          `Words added: ${addedWords}, Words deleted: ${deletedWords}`
        );
      });
    })
  );

  context.subscriptions.push({
    dispose: async () => {
      if (!hasLogged) {
        await logUsageToMongo();
        await logFileActivityToMongo();
        hasLogged = true;
      }
    },
  });
}

export async function deactivate() {
  console.log('Extension "vs-code-usage-tracker" is deactivated.');
  console.log(`VS Code closed at: ${new Date()}`);

  if (!hasLogged) {
    await logUsageToMongo();
    await logFileActivityToMongo();
    hasLogged = true;
  }
}

async function logUsageToMongo() {
  if (!mongoUri) return;

  try {
    const endTime = new Date();
    const duration = startTime
      ? (endTime.getTime() - startTime.getTime()) / 1000
      : 0;

    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log("Connected to MongoDB.");

    const db = client.db(dbName);
    const collection = db.collection(usageCollectionName);

    const logEntry = {
      start_time: startTime,
      end_time: endTime,
      duration_seconds: duration,
      date: startTime?.toISOString().split("T")[0],
    };

    if (startTime) {
      const existingEntry = await collection.findOne({
        date: logEntry.date,
        start_time: logEntry.start_time,
      });
      if (!existingEntry) {
        await collection.insertOne(logEntry);
        console.log(`Logged usage to MongoDB:`, logEntry);
      } else {
        console.log("Duplicate log entry detected and not inserted.");
      }
    }

    await client.close();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error logging usage to MongoDB:", err);
  }
}

async function logFileExtensionTimeToMongo(
  extension: string,
  duration: number
) {
  if (!mongoUri) return;

  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log("Connected to MongoDB for file extension logging.");

    const db = client.db(dbName);
    const collection = db.collection(fileExtensionCollectionName);

    const existingEntry = await collection.findOne({ extension });

    if (existingEntry) {
      await collection.updateOne(
        { extension },
        { $inc: { total_duration_seconds: duration } }
      );
      console.log(
        `Updated duration for extension "${extension}" by ${duration} seconds.`
      );
    } else {
      await collection.insertOne({
        extension,
        total_duration_seconds: duration,
      });
      console.log(
        `Created new entry for extension "${extension}" with ${duration} seconds.`
      );
    }

    await client.close();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error logging file extension time to MongoDB:", err);
  }
}

async function logFileActivityToMongo() {
  if (!mongoUri) return;

  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log("Connected to MongoDB for file activity logging.");

    const db = client.db(dbName);
    const collection = db.collection(activityCollectionName);

    const activityEntry = {
      linesAdded,
      linesDeleted,
      wordsAdded,
      wordsDeleted,
      date: new Date().toISOString().split("T")[0],
    };

    await collection.updateOne(
      { date: activityEntry.date },
      { $inc: { linesAdded, linesDeleted, wordsAdded, wordsDeleted } },
      { upsert: true }
    );

    console.log("Logged file activity to MongoDB:", activityEntry);

    await client.close();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error logging file activity to MongoDB:", err);
  }
}

function getFileExtension(fileName: string): string | null {
  const match = fileName.match(/\.(\w+)$/);
  return match ? match[1] : null;
}
