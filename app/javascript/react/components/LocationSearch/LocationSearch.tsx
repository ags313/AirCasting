import { useCombobox } from "downshift";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

import { useMap } from "@vis.gl/react-google-maps";

import locationSearchIcon from "../../assets/icons/locationSearchIcon.svg";
import { determineZoomLevel } from "../../utils/determineZoomLevel";
import { UrlParamsTypes, useMapParams } from "../../utils/mapParamsHandler";
import * as S from "./LocationSearch.style";
import useScreenSizeDetection from "../../utils/useScreenSizeDetection";
import { screenSizes } from "../../utils/media";

const OK_STATUS = "OK";

interface LocationSearchProps {
  isMapPage?: boolean;
}

type AutocompletePrediction = google.maps.places.AutocompletePrediction;

const LocationSearch: React.FC<LocationSearchProps> = ({ isMapPage }) => {
  const [items, setItems] = useState<AutocompletePrediction[]>([]);
  const [selectedItem, setSelectedItem] =
    useState<AutocompletePrediction | null>(null);
  const [inputValue, setInputValue] = useState("");
  const { t } = useTranslation();
  const map = useMap();
  const { setUrlParams } = useMapParams();
  const {
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete();

  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    onInputValueChange: ({ inputValue }) => {
      setValue(inputValue);
      setInputValue(inputValue);
    },
    items: data,
    itemToString(item) {
      return item ? item.description : "";
    },
    selectedItem,
    onSelectedItemChange: ({ selectedItem: newSelectedItem }) => {
      setSelectedItem(newSelectedItem);
      handleSelect(newSelectedItem);
    },
    inputValue,
  });

  const isSmallDesktop = useScreenSizeDetection(screenSizes.mediumDesktop);

  const displaySearchResults = isOpen && items.length > 0;

  const handleSelect = async (item: AutocompletePrediction) => {
    if (!item) return;

    setValue(item.description, false);
    clearSuggestions();
    const results = await getGeocode({ address: item.description });
    const { lat, lng } = await getLatLng(results[0]);
    const zoomLevel = determineZoomLevel(results);
    setUrlParams([
      {
        key: UrlParamsTypes.currentCenter,
        value: JSON.stringify({ lat, lng }),
      },
      {
        key: UrlParamsTypes.currentZoom,
        value: zoomLevel.toString(),
      },
    ]);

    map?.setZoom(zoomLevel);
    map?.panTo({ lat, lng });
  };

  useEffect(() => {
    if (status === OK_STATUS && data.length) {
      setItems(data);
    }
  }, [data, status]);

  return (
    <S.SearchContainer>
      <S.SearchInput
        placeholder={t("map.searchPlaceholder")}
        $displaySearchResults={displaySearchResults}
        {...getInputProps()}
      />
      {!isMapPage && !isSmallDesktop && (
        <S.LocationSearchButton
          aria-label={t("map.toggleMenu")}
          type="button"
          {...getToggleButtonProps()}
        >
          <img src={locationSearchIcon} alt={t("map.searchIcon")} />
        </S.LocationSearchButton>
      )}
      <S.SuggestionsList
        $displaySearchResults={displaySearchResults}
        {...getMenuProps()}
      >
        <S.Hr $displaySearchResults={displaySearchResults} />
        {isOpen &&
          items.map((item, index) => (
            <S.Suggestion
              key={item.place_id}
              $isHighlighted={highlightedIndex === index}
              {...getItemProps({ item, index })}
            >
              {item.description}
            </S.Suggestion>
          ))}
      </S.SuggestionsList>
    </S.SearchContainer>
  );
};

export { LocationSearch };
