import { RootState } from ".";

import { createSelector } from 'reselect';

const selectFixedSessionsState = (state: RootState) => state.fixedSessions;

export const selectSessionsData = createSelector(
  [selectFixedSessionsState],
  (fixedSessionsState) => fixedSessionsState.sessions.map(session => ({
    id: session.id,
    lastMeasurementValue: session.lastMeasurementValue,
    latitude: session.latitude,
    longitude: session.longitude,
    //temporarly using the first stream id as key
    streamId: session.streams[Object.keys(session.streams)[0]].id
  }))
);