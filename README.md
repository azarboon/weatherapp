# Weatherapp Serverless

In this workshop we will deploy a simple web application that displays the current weather in Helsinki. The application is made up of a backend and a frontend. We will deploy everything to Amazon Web Services.

The backend will be deployed as a lambda function. The frontend will be deployed as static files in an S3 bucket.

## Getting started

### 0. Get an API key

Register on https://openweathermap.org/ and get an API key. Take note of it as we will use it later.

### 1. Login to AWS and set up Cloud9 environment

Login to AWS with your credentials provided by your instructor, make sure your are in Frankfurt (**eu-central-1**) region, open Cloud9 from AWS Console, create a new Cloud9 IDE, choose Ubuntu as your OS.

We are using Cloud9 as this already configures the AWS command line tools. You could also install and configure them on your machine. But that is outside the scope of the workshop.

### 2. Fetch the source code

Once Cloud9 environment is created you will be presented with a text editor and a shell. Type the following command in the shell:

```
git clone https://github.com/djbb7/weatherapp.git

```

The code for the frontend and the backend is inside. Take a moment to go through it.

### 3. Deploy the backend

You will be assigned a group number by instructor. Remember to replace it with yourGroupNumber in commands. This is to avoid having same stack names.


#### 3.1 Create a S3 bucket

Create a S3 bucket for packaging your SAM application (replace yourGroupNumber). 

```
aws s3api create-bucket --bucket serverless-workshop-eficode-yourGroupNumber  --create-bucket-configuration LocationConstraint=eu-central-1 

```

#### 3.2 Set the API key in the source code

From the left bar (editor), open file backend/weather/app.js and replace apiKey empty value with your api key (make sure to wrap it with quotes)

#### 3.4 Install npm dependecies for backend

Run the following command
```
cd weatherapp/backend/weather && npm install
```

#### 3.5 Upload the backend files to the created bucket

Now go to root of your backend (that is, weatherapp/backend), package your SAM app (behind the scenes, it uploads your template.yaml to your s3 bucket and creates packaged.yaml):

```
cd ..
sam package --s3-bucket serverless-workshop-eficode-yourGroupNumber --template-file template.yaml --region eu-central-1 --output-template-file packaged.yaml --region eu-central-1
```

Then deploy your application (packaged.yaml). Don't foget to replace yourGroupNumber in both commands:
```
sam deploy --template-file packaged.yaml --capabilities CAPABILITY_NAMED_IAM --stack-name weather-app-yourGroupNumber --region eu-central-1

```

"sam deploy" creates a **Lambda function** and an **API gateway** and links them together. Once deployment finish, you will see BaseApi in the outputs. Copy the outputed value. Now your backend is ready! Let's have a frontend application hosted in AWS S3:

### 4. Deploy the frontend

For the frontend we are use webpack to transpile our javascript files into a syntax that is understandable by the browsers. Webpack also compresses the javascript files (a process called *minification*) and generates a random hash in the filename to prevent browser caching.

#### 4.1. Set the backend URL
Open `backend/frontend/src/index.jsx` and replace apiURL with the *BaseApi*  value obtained when the backend was deployed.

#### 4.2 Install and compile the frontend

Install all dependencies
```
cd frontend
npm install 
```

Build application

```
npm run build
```

#### 4.3 Create an S3 bucket to host your site
Create a new S3 bucket to host your frontend. (replace yourGroupNumber in all commands)

```
aws s3api create-bucket --bucket serverless-workshop-eficode-frontend-yourGroupNumber  --create-bucket-configuration LocationConstraint=eu-central-1 
```

Configure your new bucket to host static websites


```
aws s3 website  s3://serverless-workshop-eficode-frontend-yourGroupNumber/ --index-document index.html
```

#### 4.4 Upload your build artifacts to S3

```
aws s3 cp dist s3://serverless-workshop-eficode-frontend-yourGroupNumber/ --recursive --acl public-read

```

Now, you can check your website from this url!

https://serverless-workshop-eficode-frontend-yourGroupNumber.s3.eu-central-1.amazonaws.com/index.html

## Bonus 1: Secure secrets

In the previous instructions you had to manually modify the source code of your application to include the apiKey. This is a manual task, inconvenient and also insecure. ***It would be a terrible idea to upload this to version control.*** Someone could steal your API key and use it at your expense.

Luckily AWS provides a Secret Manager that stores secrets encrypted at rest and in transit.

### 0. Store your API key using the Secret Manager

Replace `api-key-value` with your API key and run the following command:
```
aws secretsmanager create-secret --name openweather-api-key-yourGroupNumber --secret-string 'api-key-value'
```

If you navigate to the Secret Manager on the AWS account panel, you will see that your secret has been created.

### 1. Modify the SAM template to read the secret

Now you should modify your SAM template.yaml file and the backend to read the secret from the secret manager. For simplicity you can check out the branch called `secure`:

```
git checkout secure
```

Open the template.yaml file. You will see that the function definition has an environment variable that reads the API key from the Secret Manager:

```
...
      Environment:
        Variables:
          API_KEY: '{{resolve:secretsmanager:openweather-api-key:SecretString:::}}' 
...
```

The `backend/weather/app.js` has also been modified to read the API key from an environment variable.

### 2. Re-deploy the backend

Since we modified backend files, we need to re-deploy it:

```
sam package --s3-bucket serverless-workshop-eficode-yourGroupNumber --template-file template.yaml --region eu-central-1 --output-template-file packaged.yaml --region eu-central-1
```

```
sam deploy --template-file packaged.yaml --capabilities CAPABILITY_NAMED_IAM --stack-name weather-app-yourGroupNumber --region eu-central-1
```

Navigate to your lambda function in the AWS panel and you will see that the lambda function now has an environment variable with the value set to your API key!

## Bonus 2: More secure secrets

Now we have a solution that allows us to use the API key in our project without writing it in the code. However, it is still exposed to anyone who can access the definition of our lambda function. In some cases, hacked can construct attacks that will print the environment variables, so the API key could still be leaked.

A more secure approach would be if our function fetched the API key from the secrets manager every time. Let's try that.

### 0. Store the API key in the secret manager

If you haven't already, store the API key using the instructions from Bonus 1.

### 1. Modify the SAM template and source code

There are two modifications that we should make to the code:
1. Write some javascript code inside app.js that will fetch the secret value dynamically every time the lambda function is called.
2. Grant permission to our lambda function to access the Secret Manager. This is done by explicitely defining the permissions to the function in template.yaml

For simplicity you can check out the branch called `secure2`:

```
git checkout secure2
```

Open the template.yaml file. You will see that we have created a new row and assigned it to the function:

```
...
Resources:
  WeatherFunction:
    Type: AWS::Serverless::Function # More info about Function Resource: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction
    Properties:
      CodeUri: weather/
      Handler: app.lambdaHandler
      Runtime: nodejs10.x
      Role:  !GetAtt SecretsManagerRole.Arn
      Events:
        Weather:
          Type: Api # More info about API Event Source: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api
          Properties:
            Path: /weather
            Method: get

  SecretsManagerRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - 'lambda.amazonaws.com'
            Action:
              - 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
      Policies:
        -
          PolicyName: 'SecretsManagerAccess'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              -
                Effect: Allow
                Action:
                  - 'secretsmanager:GetSecretValue*'
                Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:openweather-api-key*'
...
```

The `backend/weather/app.js` has also been modified to use the `aws-sdk` library.

### 2. Re-deploy the backend

Since we modified backend files, we need to re-deploy it:

```
sam package --s3-bucket serverless-workshop-eficode-yourGroupNumber --template-file template.yaml --region eu-central-1 --output-template-file packaged.yaml --region eu-central-1
```

```
sam deploy --template-file packaged.yaml --capabilities CAPABILITY_NAMED_IAM --stack-name weather-app-yourGroupNumber --region eu-central-1
```

Navigate to your lambda function in the AWS panel and you will see that the lambda function no longer has the API key as an environment variable. Yet if you visit the S3 bucket with your browser the application is still working!
