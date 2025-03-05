#!/bin/bash
pm2 start start_server.sh --name "5sonai-server"
pm2 start start_client.sh --name "5sonai-client"
