#!/usr/bin/env bash
# Provision IoT Core app policy and attach IAM permissions for acchymns-rn.
#
# Usage: ./infra/setup-iot-app-access.sh [identity-pool-id] [region]

set -euo pipefail

IDENTITY_POOL_ID="${1:-us-east-2:b4399f56-af48-4544-b368-31e6701d544c}"
REGION="${2:-us-east-2}"
IOT_POLICY_NAME="HymnSignAppPublish"
IAM_POLICY_NAME="HymnSignAppIoTPublish"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOT_POLICY_FILE="${SCRIPT_DIR}/iot-app-publish-policy.json"
IAM_POLICY_FILE="${SCRIPT_DIR}/cognito-iot-policy.json"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_NAME="$(aws cognito-identity get-identity-pool-roles \
  --identity-pool-id "${IDENTITY_POOL_ID}" \
  --region "${REGION}" \
  --query 'Roles.authenticated' \
  --output text | awk -F'/' '{print $NF}')"

if [[ -z "${ROLE_NAME}" || "${ROLE_NAME}" == "None" ]]; then
  echo "Could not find authenticated role for pool ${IDENTITY_POOL_ID}" >&2
  exit 1
fi

echo "Creating/updating IoT policy ${IOT_POLICY_NAME}..."
if aws iot get-policy --policy-name "${IOT_POLICY_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  aws iot create-policy-version \
    --policy-name "${IOT_POLICY_NAME}" \
    --policy-document "file://${IOT_POLICY_FILE}" \
    --set-as-default \
    --region "${REGION}" >/dev/null
else
  aws iot create-policy \
    --policy-name "${IOT_POLICY_NAME}" \
    --policy-document "file://${IOT_POLICY_FILE}" \
    --region "${REGION}" >/dev/null
fi

echo "Attaching IAM inline policy ${IAM_POLICY_NAME} to role ${ROLE_NAME}..."
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "${IAM_POLICY_NAME}" \
  --policy-document "file://${IAM_POLICY_FILE}"

echo "Done. IoT policy ${IOT_POLICY_NAME} is ready for Cognito identity AttachPolicy (account ${ACCOUNT_ID})."
