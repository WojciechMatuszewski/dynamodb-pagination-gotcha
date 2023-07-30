import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as http_api from "@aws-cdk/aws-apigatewayv2-alpha";
import * as http_api_integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export class DynamoCursorPaginationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dataTable = new cdk.aws_dynamodb.Table(this, "DataTable", {
      partitionKey: { name: "pk", type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: cdk.aws_dynamodb.AttributeType.STRING },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    new cdk.CfnOutput(this, "DataTableName", {
      value: dataTable.tableName
    });

    const seedFunction = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "SeedFunction",
      {
        entry: "lib/seed.ts",
        handler: "handler",
        logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
        environment: {
          TABLE_NAME: dataTable.tableName
        }
      }
    );
    dataTable.grantWriteData(seedFunction);

    new cdk.triggers.Trigger(this, "SeedTrigger", {
      handler: seedFunction,
      executeOnHandlerChange: true,
      executeAfter: [dataTable]
    });

    const api = new http_api.HttpApi(this, "Api", {
      corsPreflight: {
        allowHeaders: ["*"],
        allowMethods: [http_api.CorsHttpMethod.GET],
        allowOrigins: ["*"]
      }
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "No URL"
    });

    const defaultPaginationHandler = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "DefaultPaginationFunction",
      {
        entry: "lib/default-pagination.ts",
        environment: {
          TABLE_NAME: dataTable.tableName
        }
      }
    );
    dataTable.grantReadData(defaultPaginationHandler);

    const defaultPaginationIntegration =
      new http_api_integrations.HttpLambdaIntegration(
        "DefaultPaginationIntegration",
        defaultPaginationHandler
      );

    api.addRoutes({
      path: "/default-pagination",
      methods: [http_api.HttpMethod.GET],
      integration: defaultPaginationIntegration
    });

    const betterPaginationHandler = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "BetterPaginationFunction",
      {
        entry: "lib/better-pagination.ts",
        environment: {
          TABLE_NAME: dataTable.tableName
        }
      }
    );
    dataTable.grantReadData(betterPaginationHandler);

    const betterPaginationIntegration =
      new http_api_integrations.HttpLambdaIntegration(
        "BetterPaginationIntegration",
        betterPaginationHandler
      );

    api.addRoutes({
      path: "/better-pagination",
      methods: [http_api.HttpMethod.GET],
      integration: betterPaginationIntegration
    });
  }
}
