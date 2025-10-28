import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

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

    if (elements.length === 0) {
        return <div className="w-full rounded-xl border-2 py-10 text-center color-muted">No results</div>;
    }

    const centerLat =
        elements.length === 0
            ? 0
            : elements.map(element => element.lat).reduce((sum, lat) => sum + lat, 0) / elements.length;
    const centerLon =
        elements.length === 0
            ? 0
            : elements.map(element => element.lon).reduce((sum, lon) => sum + lon, 0) / elements.length;

    return (
        <MapContainer
            center={[centerLat, centerLon]}
            zoom={13}
            scrollWheelZoom={true}
            className="w-full aspect-video rounded-xl"
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {elements.map(element => (
                <Marker position={[element.lat, element.lon]} key={element.id}>
                    <Popup>
                        <ul>
                            {Object.entries(element.tags).map(([key, value]) => (
                                <li key={key}>
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
