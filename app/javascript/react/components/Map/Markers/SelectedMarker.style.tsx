import styled from "styled-components";

interface MarkerProps {
  color: string;
}

const SelectedShadowCircle = styled.div<MarkerProps>`
  height: 5rem;
  width: 5rem;
  border-radius: 50%;
  background-color: ${(props) => props.color + "66"};
  pointer-events: none;
`;

const SelectedDataContainer = styled.div`
  width: 10rem;
  height: 3rem;
  display: flex;
  position: absolute;
  top: 1rem;
  left: 1rem;
  border-radius: 1.5rem;
  border: 1px solid ${(props) => props.color};
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  background-color: white;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  pointer-events: none;
`;

export { SelectedShadowCircle, SelectedDataContainer };
