require("dotenv").config();
import * as vscode from "vscode";
import { MongoClient } from "mongodb";

let startTime: Date;
const mongoUri = process.env.MONGODB_URI; // MongoDB URI
const dbName = "vsCodeUsageDB"; // Database name
const collectionName = "usage_log"; // Collection name

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vs-code-usage-tracker" is now active! this 	running?');

  // Record the start time when VS Code is opened
  startTime = new Date();
  console.log(`VS Code opened at: ${startTime}`);

  // Log when files are opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      console.log(`Opened file: ${doc.uri.fsPath}`);
    })
  );

  // Add cleanup when VS Code or the extension is deactivated
  context.subscriptions.push({
    dispose: async () => {
      await logUsageToMongo();
    },
  });
}

export async function deactivate() {
  console.log('Extension "vs-code-usage-tracker" is deactivated.');

  // Log usage data before deactivation
  await logUsageToMongo();
}

async function logUsageToMongo() {
  try {
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    const client = new MongoClient(mongoUri);
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

    console.log(`Logged usage to MongoDB:`, logEntry);
    await client.close();
  } catch (err) {
    console.error("Error logging usage to MongoDB:", err);
  }
}
