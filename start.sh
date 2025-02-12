#!/bin/bash
pm2 start start_server.sh --name "rockeeai-server"
pm2 start start_client.sh --name "rockeeai-client"
