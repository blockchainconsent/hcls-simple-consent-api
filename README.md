# hcls-simple-consent-api

### Prerequisites

- NodeJS 12.22.0
- Docker: https://hub.docker.com/search?type=edition&offering=community
- Latest version of VSCode: https://code.visualstudio.com/
- If spinning up a local Fabric 2 network, the IBM Blockchain Platform VSCode Extension (version 2+)

### Environment Variables

Save a .env file in the root directory with the following environment variables:
- APP_ID_URL
- APP_ID_TENANT_ID
- APP_ID_CLIENT_ID
- APP_ID_SECRET
- APP_ID_IAM_KEY
- APP_ID_TEST_EMAIL - Email address for an AppID user that will be created in the mocha tests.
- APP_ID_TEST_PASSWORD - Password for an AppID user that will be created in the mocha tests.
- APP_ID_TEST_EMAIL2 - Email address for an AppID user that will be created in the mocha tests for invalid TenantID.
- APP_ID_TEST_PASSWORD2 - Password for an AppID user that will be created in the mocha tests fort invalid TenantID.
- KEYPROTECT_URL
- KEYPROTECT_GUID
- KEYPROTECT_SERVICE_API_KEY - for dev and local testing, populate with your [IBM Cloud API Key](https://cloud.ibm.com/docs/account?topic=account-userapikey#create_user_key)
- DEIDENTIFIER_URL
- DEIDENTIFIER_USER_ID
- DEIDENTIFIER_SECRET
- BC_ADMIN_SECRET - blockchain admin user secret
- APP_ID_FHIR_URL
- APP_ID_FHIR_TENANT_ID
- APP_ID_FHIR_CLIENT_ID
- APP_ID_FHIR_CLIENT_SECRET
- FHIR_HOST

### Package Smart Contract

If you are planning to spin up a local Hyperledger Fabric 2 network and do not already have the latest version of the chaincode (a .tar.gz file) on your machine, you will need to complete this step.

The corresponding chaincode for the Simple Consent API is located in this [repository](https://github.com/HCLS-Consent-Manager/hcls-simple-consent-cc).

To package the smart contract, follow the instructions in the [README](https://github.com/HCLS-Consent-Manager/hcls-simple-consent-cc/blob/master/README.md).

### Option 1: Save Configuration for an Existing Hyperledger Fabric 2 Network in IBP

- Navigate to the IBP console, open the MSP, and download the connection profile
- Copy the contents of the connection profile into `config/ibp/profile.json`
- Update `config/config.json`:
    - admin (blockchain admin user id)
    - chaincodeName
    - channelName

### Option 2: Spin Up a Local Hyperledger Fabric 2 Network

#### Import Smart Contract

1. On the left-most panel in VSCode, navigate to the IBM Blockchain Platform symbol.
2. In the Smart Contracts panel, click the three dots "..." on the right-hand side.
3. Select "Import a package" > "Browse".
4. Navigate to and select a .tar.gz file saved on your machine (ex: simple-consent-cc@1.0.0.tar.gz).

#### Spin Up Local Fabric 2 Network

3. Under Fabric Environments, click "+ Add local or remote environment".
4. Select "Create new from template (uses Docker on your local machine)".
5. Choose one of the default configurations, for example "2 Org template"
6. Enter a name: for example "Local Fabric 2 Orgs"
7. Select channel capability: V2_0
8. Under Fabric Environments > Simple local networks, selectin  "Local Fabric 2 Orgs"
9. Select "mychannel"
10. Select "+ Deploy smart contract"
11. Select "Select smart contract"
12. Select the packaged smart contract (check the name and version) that you imported in "Import smart contract" step 5.
13. Click the blue "Next" button twice and the blue "Deploy" once.
14. VSCode will the start the process of deploying the smart contract.  Wait until you see a "Successfully deployed smart contract" pop-up on the bottom right-hand side of your screen.  Under Fabric Environments > mychannel you should now see a smart contract with a name such as: simple-consent-cc@1.0.0.

#### Export the connection profile

15. Under the Fabric Gateways panel, select Local Fabric 2 Orgs > Org1 Gateway.
16. Click the three dots "..." on the same panel.
17. Select "Export Connection Profile". Replace the existing `/config/ibp/profile.json` with this new file.

#### Additional Configuration

**Important**: If you spin up a **local Fabric 2 network**, replace the existing value of `adminKeyName` in `/config/config.json` to a unique string of your choosing.

This is the name of the key for the blockchain admin user on your local Fabric 2 network, which will be saved in KeyProtect.

### AppID

Simple Consent uses AppID for user authentication and authorization. Each user must be registered to the relevant AppID instance.

Configure the following scopes in AppID:
- cm.admin

Each AppID user will need:
- A role or roles encompassing the desired scopes listed above
- A custom attribute called `TenantID`, which represents the entity for which consents are saved

#### Configure Custom Attributes

If pointing to a new AppID instance, configure the instance to return the AppID user's custom attribute `TenantID` in access tokens.

1. Retrieve an IBM Cloud access token using your [IBM Cloud API Key](https://cloud.ibm.com/docs/account?topic=account-userapikey#create_user_key).

```
curl -k -X POST "https://iam.cloud.ibm.com/identity/token" \
--header "Content-Type: application/x-www-form-urlencoded" \
--header "Accept: application/json" \
--data-urlencode "grant_type=urn:ibm:params:oauth:grant-type:apikey" \
--data-urlencode "apikey=<IBM CLOUD API KEY>"
```

2. Save the access_token returned in the response to an environment variable.

```
export ACCESS_TOKEN=<access_token from response>
```

3. The following curl command will configure the AppID instance to return the TenantID custom attribute in access tokens.  Populate `APP_ID_TENANT_ID` in the curl command before executing.

```
curl --location --request PUT 'https://us-south.appid.cloud.ibm.com/management/v4/<APP_ID_TENANT_ID>/config/tokens' \
--header "Authorization: Bearer $ACCESS_TOKEN" \
--header 'Content-Type: application/json' \
--data-raw '{
 "access": {
     "expires_in": 3600
 },
 "refresh": {
     "enabled": false
 },
 "anonymousAccess": {
     "enabled": false
 },
 "accessTokenClaims": [
      {
        "source": "attributes",
        "sourceClaim": "TenantID",
        "destinationClaim": "TenantID"
      }
 ]
}'
```
### Start the NodeJS App

`npm install`

`npm run start`

## Lint all files

`npm run lint`

### Lint fix

`npm run lint:fix`
