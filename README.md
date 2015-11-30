# Prometheus Demo

A demonstration of how to configure Prometheus to capture metrics from a Node.js
app, and a MongoDB instance.

The purpose of the demo is to provide examples of how to connect Prometheus to
different nodes that either provide a metrics endpoint natively or require a
separate exporter to be running.

Prometheus itself is available on your Docker host at port 9090. If you're
running on Linux this will be `http://localhost:9090`. If you are on Mac or
Windows it will be the IP of the VM running Docker:

```
docker-machine ip <name_of_machine>
```

## Demo prerequisites

Please make sure you have the following installed on your system before running
the demo:

1. The latest version of [Docker](http://docs.docker.com/mac/started/)
including docker-compose.

## Running the demo

To start the components of the demo execute the following command from the root
folder:

```
docker-compose up
```

To run the components in the background add the `-d` argument to the command:

```
docker-compose up -d
```

## Stopping the demo

To stop all running components either hit `CTRL+C` if running interactively or
execute the following when running in the background:

```
docker-compose stop
```
