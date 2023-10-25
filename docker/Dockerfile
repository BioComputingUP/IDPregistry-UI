# Use the official Node.js LTS image as the base image
FROM node:20.8.0 as build

# Set the working directory
WORKDIR /app

RUN git clone https://github.com/BioComputingUP/IDPregistry-UI.git .

# Install dependencies
RUN npm install

# Build the Angular app for production
RUN npm run build

# Use the official Apache image as the production server
FROM httpd:2.4

# Copy the Angular app's dist directory to the Apache web server
COPY --from=build /app/dist/idpcentral/ /usr/local/apache2/htdocs/

# Copy the Apache configuration file to the Apache web server
COPY docker/apache2/httpd.conf /usr/local/apache2/conf/httpd.conf
