# Use the official Node.js LTS image as the base image
FROM node:20.8.0 as build

# Set the working directory
WORKDIR /app

RUN git clone --single-branch --branch dockerize https://github.com/BioComputingUP/IDPregistry-UI.git .

# Install dependencies
RUN npm install --loglevel=error

# Build the Angular app for production
RUN npm run build --loglevel=error

# Use the official Apache image as the production server
FROM httpd:2.4

# Copy the Angular app's dist directory to the Apache web server
COPY --from=build /app/dist/idpcentral/ /usr/local/apache2/htdocs/

# Copy the Apache configuration file to the Apache web server
COPY --from=build /app/docker/apache2/httpd.conf /usr/local/apache2/conf/httpd.conf

EXPOSE 80
