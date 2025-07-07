// index.js
require("dotenv").config();
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const SPRINTS_DB_ID = process.env.SPRINTS_DB_ID;
const TICKETS_DB_ID = process.env.TICKETS_DB_ID;

async function getCurrentSprint() {
  const response = await notion.databases.query({
    database_id: SPRINTS_DB_ID,
    filter: {
      property: "Sprint Status",
      formula: {
        string: {
          equals: "Current",
        },
      },
    },
  });

  return response.results[0];
}

async function getRecurringTasksWithoutSprint() {
  const response = await notion.databases.query({
    database_id: TICKETS_DB_ID,
    filter: {
      property: "Sprint",
      relation: {
        is_empty: true,
      },
    },
  });

  return response.results;
}

async function assignSprintToTasks(tasks, sprint) {
  for (const task of tasks) {
    await notion.pages.update({
      page_id: task.id,
      properties: {
        Sprint: {
          relation: [{ id: sprint.id }],
        },
      },
    });
    console.log(
      `Assigned task "${task.properties.Task.title?.[0]?.plain_text}" to sprint "${sprint.properties["Sprint name"].title?.[0]?.plain_text}"`
    );
  }
}

(async () => {
  const currentSprint = await getCurrentSprint();
  if (!currentSprint) {
    console.error("❌ No current sprint found.");
    return;
  }

  const tasks = await getRecurringTasksWithoutSprint();
  if (tasks.length === 0) {
    console.log("✅ No recurring tasks need updating.");
    return;
  }

  console.log(
    `Sprint: ${currentSprint.properties["Sprint name"].title[0]?.plain_text}`
  );

  console.log(
    `📌 Updating ${tasks.length} task(s) to Sprint "${currentSprint.properties["Sprint name"].title?.[0]?.plain_text}"`
  );
  await assignSprintToTasks(tasks, currentSprint);
})();
