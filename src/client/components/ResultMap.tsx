import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

type Props = {
    elements: OSMNode[];
};

export type OSMNode = {
    type: 'node';
    id: number;
    lat: number;
    lon: number;
    tags: Record<string, string>;
};

export const ResultMap: React.FC<Props> = ({ elements }) => {
    console.log(elements);

    const mapCenter: LatLngExpression = elements.length > 0 ? [elements[0].lat, elements[0].lon] : [0, 0];

    return (
        <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} className="w-full h-[500px]">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {elements.map(element => (
                <Marker position={[element.lat, element.lon]} key={element.id}>
                    <Popup>
                        <ul>
                            {Object.entries(element.tags).map(([key, value]) => (
                                <li>
                                    <b>{key}</b>: {value}
                                </li>
                            ))}
                        </ul>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};
