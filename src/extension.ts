import * as vscode from "vscode";
import { MongoClient } from "mongodb";
require("dotenv").config();

let startTime: Date;
let hasLogged = false;

const mongoUri = process.env.MONGO_URI;
const dbName = "vsCodeUsageDB"; 
const collectionName = "usage_log";

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vs-code-usage-tracker" is now active!');

  
  startTime = new Date();
  console.log(`VS Code opened at: ${startTime}`);

  
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      console.log(`Opened file: ${doc.uri.fsPath}`);
    })
  );

  
  context.subscriptions.push({
    dispose: async () => {
      if (!hasLogged) {
        await logUsageToMongo();
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
    hasLogged = true;
  }
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
      date: startTime.toISOString().split("T")[0], 
    };


    const existingEntry = await collection.findOne({ date: logEntry.date, start_time: logEntry.start_time });
    if (!existingEntry) {
      await collection.insertOne(logEntry);
      console.log(`Logged usage to MongoDB:`, logEntry);
    } else {
      console.log("Duplicate log entry detected and not inserted.");
    }

    await client.close();
  } catch (err) {
    console.error("Error logging usage to MongoDB:", err);
  }
}
