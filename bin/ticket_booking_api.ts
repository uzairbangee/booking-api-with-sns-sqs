#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TicketBookingApiStack } from '../lib/ticket_booking_api-stack';

const app = new cdk.App();
new TicketBookingApiStack(app, 'TicketBookingApiStack');
