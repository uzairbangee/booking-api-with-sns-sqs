import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as TicketBookingApi from '../lib/ticket_booking_api-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new TicketBookingApi.TicketBookingApiStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
