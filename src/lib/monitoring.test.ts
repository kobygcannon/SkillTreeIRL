import {afterEach,describe,expect,it} from "vitest";
import {monitoringConfigurationReady} from "./monitoring";

const originalUrl=process.env.ERROR_MONITOR_URL,originalToken=process.env.ERROR_MONITOR_TOKEN,originalDsn=process.env.SENTRY_DSN;
afterEach(()=>{
  if(originalUrl===undefined)delete process.env.ERROR_MONITOR_URL;else process.env.ERROR_MONITOR_URL=originalUrl;
  if(originalToken===undefined)delete process.env.ERROR_MONITOR_TOKEN;else process.env.ERROR_MONITOR_TOKEN=originalToken;
  if(originalDsn===undefined)delete process.env.SENTRY_DSN;else process.env.SENTRY_DSN=originalDsn;
});

describe("production monitoring configuration",()=>{
  it("requires an HTTPS ingestion endpoint and restricted token",()=>{
    delete process.env.SENTRY_DSN;
    process.env.ERROR_MONITOR_URL="http://monitor.example.test/ingest";
    process.env.ERROR_MONITOR_TOKEN="restricted-token";
    expect(monitoringConfigurationReady()).toBe(false);
    process.env.ERROR_MONITOR_URL="https://monitor.example.test/ingest";
    expect(monitoringConfigurationReady()).toBe(true);
    delete process.env.ERROR_MONITOR_TOKEN;
    expect(monitoringConfigurationReady()).toBe(false);
  });
  it("accepts a valid HTTPS Sentry DSN",()=>{
    process.env.SENTRY_DSN="https://public@example.ingest.sentry.io/1";
    expect(monitoringConfigurationReady()).toBe(true);
    process.env.SENTRY_DSN="not-a-dsn";
    expect(monitoringConfigurationReady()).toBe(false);
  });
});
