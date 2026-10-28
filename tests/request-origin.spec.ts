import { test, expect } from "@playwright/test";
import { isAllowedRequestOrigin } from "../lib/request-origin";

const site = "https://factory.vgatefurnishing.com";
const internal = "http://127.0.0.1:4000";

test("public HTTPS origin works behind an internal HTTP proxy", () => {
  expect(
    isAllowedRequestOrigin(
      new Headers({ origin: site, "sec-fetch-site": "same-origin" }),
      internal,
      site,
    ),
  ).toBe(true);
  expect(
    isAllowedRequestOrigin(new Headers({ origin: site }), internal, `${site}/`),
  ).toBe(true);
});

test("cross-site, missing and null origins remain blocked", () => {
  for (const origin of [
    "https://untrusted.test",
    "https://factory.vgatefurnishing.com.untrusted.test",
    "null",
    "",
  ]) {
    expect(
      isAllowedRequestOrigin(new Headers({ origin }), internal, site),
    ).toBe(false);
  }
  expect(
    isAllowedRequestOrigin(
      new Headers({ origin: site, "sec-fetch-site": "cross-site" }),
      internal,
      site,
    ),
  ).toBe(false);
});

test("forwarded headers cannot expand the trusted origin", () => {
  const headers = new Headers({
    origin: "https://untrusted.test",
    "x-forwarded-host": "untrusted.test",
    "x-forwarded-proto": "https",
  });
  expect(isAllowedRequestOrigin(headers, internal, site)).toBe(false);
  expect(isAllowedRequestOrigin(headers, internal, undefined)).toBe(false);
});

test("invalid origin configuration fails closed", () => {
  for (const configured of [
    "*",
    "not a URL",
    `${site}/api`,
    `${site}?x=1`,
    `${site}#fragment`,
    "https://user:password@factory.vgatefurnishing.com",
    "file:///tmp",
  ]) {
    expect(
      isAllowedRequestOrigin(
        new Headers({ origin: site }),
        internal,
        configured,
      ),
    ).toBe(false);
  }
});

test("local development retains same-origin behavior", () => {
  expect(
    isAllowedRequestOrigin(
      new Headers({ origin: internal }),
      internal,
      undefined,
    ),
  ).toBe(true);
  expect(
    isAllowedRequestOrigin(new Headers({ origin: site }), internal, undefined),
  ).toBe(false);
});
