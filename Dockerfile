# Use the official Node.js image as a base image
FROM node:20.10.0

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install nodemon and pm2 globally
RUN npm install -g pm2

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set directory permissions
RUN chmod -R 777 /usr/src/app/static/

# Install OpenSSH server
RUN apt-get update && \
    apt-get install -y openssh-server && \
    mkdir /var/run/sshd && \
    echo 'root:password' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Set up SFTP access
RUN useradd -m -s /bin/bash sftpuser && \
    echo 'sftpuser:password' | chpasswd && \
    usermod -aG sudo sftpuser && \
    mkdir /home/sftpuser/upload && \
    chown sftpuser:sftpuser /home/sftpuser/upload

# Open ports for SSH and your app
EXPOSE 22 4000

# Start SSH and your app with PM2
CMD service ssh start && pm2 start index.js --name DEV_API && pm2 logs
