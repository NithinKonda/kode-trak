import * as vscode from "vscode";
import { MongoClient } from "mongodb";

let startTime: Date;
const mongoUri = "mongodb://localhost:27017"; // Replace with your MongoDB URI
const dbName = "vsCodeUsageDB"; // Database name
const collectionName = "usage_log"; // Collection name

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vs-code-usage-tracker" is now active!');

  // Record the start time when VS Code is opened
  startTime = new Date();
  console.log(`VS Code opened at: ${startTime}`);

  // When a file is opened, log the time
  vscode.workspace.onDidOpenTextDocument((doc) => {
    console.log(`Opened file: ${doc.uri.fsPath}`);
  });

  // When the extension is deactivated (VS Code is closing)
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const endTime = new Date();
      console.log(`VS Code closed at: ${endTime}`);

      // Calculate usage time in seconds
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      // Log to MongoDB
      logUsageToMongo(startTime, endTime, duration);
    })
  );
}

export function deactivate() {
  console.log('Extension "vs-code-usage-tracker" is deactivated.');
}

async function logUsageToMongo(
  startTime: Date,
  endTime: Date,
  duration: number
) {
  try {
    const client = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const logEntry = {
      start_time: startTime,
      end_time: endTime,
      duration_seconds: duration,
      date: startTime.toISOString().split("T")[0], // Storing only the date part (YYYY-MM-DD)
    };

    await collection.insertOne(logEntry);

    console.log(`Logged usage: ${logEntry}`);
    await client.close();
  } catch (err) {
    console.error("Error logging usage to MongoDB:", err);
  }
}
