# run-remote-service

Node.js middleware used for proxying incoming HTTP service requests to an awaiting worker pool.

see also: `run-service` module

## Introduction

This small module is what [hook.io](hook.io) uses to send microservice requests to our elastic worker pool. You are encouraged to use this module as-is, or modify it to suite your needs.

If you are interested in contributing please let us know!

## Features

 - Basic round-robin strategy
 - Configurable worker pool