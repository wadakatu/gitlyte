// You can import your modules
// import index from '../src/index'

import nock from "nock";
// Requiring our app implementation
import myProbotApp from "../src/index.js";
import { Probot, ProbotOctokit } from "probot";
// Requiring our fixtures
//import payload from "./fixtures/issues.opened.json" with { "type": "json"};
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, beforeEach, afterEach, test, expect } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8",
);

const prPayload = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/pr.closed.json"), "utf-8"),
);

describe("My Probot app", () => {
  let probot: any;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load our app into probot
    probot.load(myProbotApp);
  });

  test("generates site when enhancement PR is merged", async () => {
    const mock = nock("https://api.github.com")
      // Test that we correctly return a test token
      .post("/app/installations/2/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          contents: "write",
          metadata: "read",
        },
      })
      
      // Mock repo info
      .get("/repos/hiimbex/testing-things")
      .reply(200, {
        name: "testing-things",
        description: "A test repository",
        stargazers_count: 5,
        forks_count: 2
      })
      
      // Mock PRs
      .get("/repos/hiimbex/testing-things/pulls?state=closed&per_page=10")
      .reply(200, [])
      
      // Mock issues
      .get("/repos/hiimbex/testing-things/issues?state=all&per_page=10")
      .reply(200, [])
      
      // Mock README
      .get("/repos/hiimbex/testing-things/readme")
      .reply(200, {
        content: Buffer.from("# Test Project\nThis is a test").toString("base64")
      })
      
      // Mock Pages check
      .get("/repos/hiimbex/testing-things/pages")
      .reply(404)
      
      // Mock Pages setup
      .post("/repos/hiimbex/testing-things/pages")
      .reply(201)
      
      // Mock file creation
      .put("/repos/hiimbex/testing-things/contents/docs/index.html")
      .reply(201)
      
      .put("/repos/hiimbex/testing-things/contents/docs/style.css")
      .reply(201);

    // Receive a webhook event
    await probot.receive({ name: "pull_request", payload: prPayload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

// For more information about testing with Jest see:
// https://facebook.github.io/jest/

// For more information about using TypeScript in your tests, Jest recommends:
// https://github.com/kulshekhar/ts-jest

// For more information about testing with Nock see:
// https://github.com/nock/nock
