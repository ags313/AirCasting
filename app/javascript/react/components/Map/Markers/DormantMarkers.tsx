import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

import { setVisibility } from "../../../store/clusterSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectHoverStreamId } from "../../../store/mapSlice";
import { Session } from "../../../types/sessionType";
import useMapEventListeners from "../../../utils/mapEventListeners";
import HoverMarker from "./HoverMarker/HoverMarker";

import { gray300 } from "../../../assets/styles/colors";
import {
  selectFixedStreamData,
  selectFixedStreamStatus,
} from "../../../store/fixedStreamSelectors";
import { setMarkersLoading } from "../../../store/markersLoadingSlice";
import { StatusEnum } from "../../../types/api";
import type { LatLngLiteral } from "../../../types/googleMaps";
import { SessionDotMarker } from "./SessionDotMarker/SessionDotMarker";
import * as S from "./SessionFullMarker/SessionFullMarker.style";

type Props = {
  sessions: Session[];
  onMarkerClick: (streamId: number | null, id: number | null) => void;
  selectedStreamId: number | null;
  pulsatingSessionId: number | null;
};

const DormantMarkers = ({
  sessions,
  onMarkerClick,
  selectedStreamId,
  pulsatingSessionId,
}: Props) => {
  const ZOOM_FOR_SELECTED_SESSION = 15;

  const dispatch = useAppDispatch();
  const hoverStreamId = useAppSelector(selectHoverStreamId);
  const fixedStreamStatus = useAppSelector(selectFixedStreamStatus);
  const fixedStreamData = useAppSelector(selectFixedStreamData);

  const map = useMap();

  const [hoverPosition, setHoverPosition] = useState<LatLngLiteral | null>(
    null
  );
  const [markers, setMarkers] = useState<{
    [streamId: string]: google.maps.marker.AdvancedMarkerElement | null;
  }>({});
  const [visibleMarkers, setVisibleMarkers] = useState<Set<string>>(new Set());

  const memoizedSessions = useMemo(() => sessions, [sessions]);

  const markersCount = Object.values(markers).filter(
    (marker) => marker !== null
  ).length;
  const markerRefs = useRef<{
    [streamId: string]: google.maps.marker.AdvancedMarkerElement | null;
  }>({});

  const centerMapOnMarker = useCallback(
    (position: LatLngLiteral) => {
      if (map && selectedStreamId) {
        map.setCenter(position);
        map.setZoom(ZOOM_FOR_SELECTED_SESSION);
      }
    },
    [map, selectedStreamId]
  );

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
      if (markerRefs.current[key] === marker) return;

      markerRefs.current[key] = marker;
      setMarkers((prev) => {
        if (marker) {
          return { ...prev, [key]: marker };
        } else {
          const newMarkers = { ...prev };
          delete newMarkers[key];
          return newMarkers;
        }
      });
    },
    []
  );

  const handleMapInteraction = useCallback(() => {
    dispatch(setVisibility(false));
  }, [dispatch]);

  useEffect(() => {
    const handleSelectedStreamId = (streamId: number | null) => {
      if (!streamId || fixedStreamStatus === StatusEnum.Pending) return;
      const { latitude, longitude } = fixedStreamData.stream;

      if (latitude && longitude) {
        const fixedStreamPosition = { lat: latitude, lng: longitude };
        centerMapOnMarker(fixedStreamPosition);
      } else {
        console.error(
          `Stream ID ${streamId} not found or missing latitude/longitude in fixedStream data.`
        );
      }
    };

    handleSelectedStreamId(selectedStreamId);
  }, [selectedStreamId, fixedStreamData, fixedStreamStatus, centerMapOnMarker]);

  useEffect(() => {
    if (selectedStreamId) {
      setVisibleMarkers(new Set([`marker-${selectedStreamId}`]));
    } else {
      setVisibleMarkers(
        new Set(
          memoizedSessions.map((session) => `marker-${session.point.streamId}`)
        )
      );
    }
  }, [selectedStreamId, memoizedSessions]);

  useEffect(() => {
    dispatch(setMarkersLoading(true));
  }, [dispatch, sessions.length]);

  useEffect(() => {
    if (hoverStreamId) {
      const hoveredSession = memoizedSessions.find(
        (session) => Number(session.point.streamId) === hoverStreamId
      );
      if (hoveredSession) {
        setHoverPosition(hoveredSession.point);
      }
    } else {
      setHoverPosition(null);
    }
  }, [hoverStreamId, memoizedSessions]);

  useEffect(() => {
    if (markersCount >= sessions.length) {
      dispatch(setMarkersLoading(false));
    }
  }, [dispatch, markersCount, sessions.length]);

  useEffect(() => {
    map && map.addListener("zoom_changed", () => handleMapInteraction());
  }, [map]);

  useMapEventListeners(map, {
    click: () => {
      handleMapInteraction();
    },
    touchend: () => {
      handleMapInteraction();
    },
    dragstart: () => {
      handleMapInteraction();
    },
  });

  return (
    <>
      {memoizedSessions.map((session) => (
        <AdvancedMarker
          position={session.point}
          key={session.point.streamId}
          zIndex={1000}
          ref={(marker) => {
            if (marker) {
              setMarkerRef(marker, session.point.streamId);
            }
          }}
        >
          <S.SessionMarkerWrapper
            id={`marker-${session.point.streamId}`}
            $isVisible={visibleMarkers.has(`marker-${session.point.streamId}`)}
          >
            <SessionDotMarker
              color={gray300}
              onClick={() => {
                onMarkerClick(
                  Number(session.point.streamId),
                  Number(session.id)
                );
                centerMapOnMarker(session.point);
              }}
              shouldPulse={session.id === pulsatingSessionId}
            />
          </S.SessionMarkerWrapper>
        </AdvancedMarker>
      ))}
      {hoverPosition && <HoverMarker position={hoverPosition} />}
    </>
  );
};

export { DormantMarkers };
