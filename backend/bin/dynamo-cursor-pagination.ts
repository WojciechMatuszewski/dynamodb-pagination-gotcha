#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DynamoCursorPaginationStack } from "../lib/dynamo-cursor-pagination-stack";

const app = new cdk.App();
new DynamoCursorPaginationStack(app, "DynamoCursorPaginationStack", {
  synthesizer: new cdk.DefaultStackSynthesizer({
    qualifier: "pagination"
  })
});
