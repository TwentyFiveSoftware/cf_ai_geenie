import React, { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { type LatLngTuple } from 'leaflet';

export type MapElement = OSMNode | OSMWay | OSMRelation;

export const ResultMap: React.FC<{ elements: MapElement[] }> = ({ elements }) => {
    if (elements.length === 0) {
        return <div className="w-full rounded-xl border-2 py-10 text-center color-muted">No results</div>;
    }

    return (
        <MapContainer center={[0, 0]} zoom={10} scrollWheelZoom={true} className="w-full aspect-[3/2] rounded-xl">
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MapLayers elements={elements} />
        </MapContainer>
    );
};

const MapLayers: React.FC<{ elements: MapElement[] }> = ({ elements }) => {
    const map = useMap();

    const markers = elements
        .map<Marker | null>(element => {
            if (element.type === 'node') {
                return { lat: element.lat, lon: element.lon, tags: element.tags ?? {} } satisfies Marker;
            }

            // if (element.type === 'way' && !element.geometry) {
            //     if (element.center) {
            //         return {
            //             lat: element.center.lat,
            //             lon: element.center.lon,
            //             tags: element.tags ?? {},
            //         } satisfies Marker;
            //     }
            //
            //     if (element.bounds) {
            //         return {
            //             lat: (element.bounds.minlat + element.bounds.maxlat) / 2,
            //             lon: (element.bounds.minlon + element.bounds.maxlon) / 2,
            //             tags: element.tags ?? {},
            //         } satisfies Marker;
            //     }
            // }

            return null;
        })
        .filter(marker => marker !== null);

    const polygons = elements
        .flatMap<MapPolygon>(element => {
            if (element.type === 'relation') {
                const polygons = element.members
                    .filter(member => member.type === 'way' && member.geometry)
                    .map<MapPolygon>(
                        member =>
                            ({
                                tags: member.tags ?? element.tags ?? {},
                                geometry: member.geometry?.map<LatLngTuple>(point => [point.lat, point.lon]) ?? [],
                                isClosed: member.role === 'inner' || member.role === 'outer',
                                role: member.role,
                                isVerySmall: false,
                            }) satisfies MapPolygon,
                    );

                mergePolygonsInPlace(polygons);
                return polygons;
            }

            if (element.type === 'way' && element.geometry) {
                return [
                    {
                        geometry: element.geometry.map<LatLngTuple>(point => [point.lat, point.lon]),
                        tags: element.tags ?? {},
                        isClosed:
                            element.nodes && element.nodes.length >= 2
                                ? element.nodes[0] === element.nodes[element.nodes.length - 1]
                                : false,
                        isVerySmall:
                            element.bounds &&
                            Math.abs(element.bounds.maxlat - element.bounds.minlat) < 0.0005 &&
                            Math.abs(element.bounds.maxlon - element.bounds.minlon) < 0.0005,
                    } satisfies MapPolygon,
                ];
            }

            return [];
        })
        .filter(polygon => polygon !== null);

    useEffect(() => {
        if (markers.length === 0 && polygons.length === 0) {
            return;
        }

        map.fitBounds(
            [
                ...markers.map<LatLngTuple>(marker => [marker.lat, marker.lon]),
                ...polygons.flatMap(polygon => polygon.geometry),
            ],
            { padding: [30, 30] },
        );
    }, [map, markers, polygons]);

    return (
        <>
            {markers.map((marker, index) => (
                <Marker key={index} position={[marker.lat, marker.lon]}>
                    <MapPopup tags={marker.tags} />
                </Marker>
            ))}

            {polygons
                .filter(polygon => polygon.isClosed)
                .map((polygon, index) => (
                    <Polygon key={index} pathOptions={{ color: 'red' }} positions={polygon.geometry}>
                        <MapPopup tags={polygon.tags} />
                    </Polygon>
                ))}

            {polygons
                .filter(polygon => !polygon.isClosed)
                .map((polygon, index) => (
                    <React.Fragment key={index}>
                        <Polyline pathOptions={{ color: 'black', weight: 5 }} positions={polygon.geometry}>
                            <MapPopup tags={polygon.tags} />
                        </Polyline>

                        {polygon.isVerySmall && (
                            <CircleMarker
                                pathOptions={{ color: 'blue', weight: 2 }}
                                center={calculateGeometryCenter(polygon.geometry)}
                                radius={7}
                            >
                                <MapPopup tags={polygon.tags} />
                            </CircleMarker>
                        )}
                    </React.Fragment>
                ))}
        </>
    );
};

const MapPopup: React.FC<{ tags: Record<string, string> }> = ({ tags }) => {
    return (
        <Popup>
            <ul>
                {Object.entries(tags).map(([key, value]) => (
                    <li key={key}>
                        <b>{key}</b>: {value}
                    </li>
                ))}
            </ul>
        </Popup>
    );
};

const mergePolygonsInPlace = (polygons: MapPolygon[]) => {
    while (true) {
        let mergedAnyPolygon = false;

        for (let i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];

            if (polygon.role !== 'inner' && polygon.role !== 'outer') {
                continue;
            }

            for (let j = 0; j < polygons.length; j++) {
                if (j === i) {
                    continue;
                }

                const otherPolygon = polygons[j];
                if (otherPolygon.role !== polygon.role) {
                    continue;
                }

                const startPoint = polygon.geometry[0];
                const endPoint = polygon.geometry[polygon.geometry.length - 1];

                const otherStartPoint = otherPolygon.geometry[0];
                const otherEndPoint = otherPolygon.geometry[otherPolygon.geometry.length - 1];

                if (startPoint[0] === otherEndPoint[0] && startPoint[1] == otherEndPoint[1]) {
                    otherPolygon.geometry.push(...polygon.geometry);
                    mergedAnyPolygon = true;
                    break;
                }

                if (endPoint[0] === otherStartPoint[0] && endPoint[1] == otherStartPoint[1]) {
                    otherPolygon.geometry.unshift(...polygon.geometry);
                    mergedAnyPolygon = true;
                    break;
                }

                if (startPoint[0] === otherStartPoint[0] && startPoint[1] == otherStartPoint[1]) {
                    otherPolygon.geometry.unshift(...polygon.geometry.reverse());
                    mergedAnyPolygon = true;
                    break;
                }

                if (endPoint[0] === otherEndPoint[0] && endPoint[1] == otherEndPoint[1]) {
                    otherPolygon.geometry.push(...polygon.geometry.reverse());
                    mergedAnyPolygon = true;
                    break;
                }
            }

            if (mergedAnyPolygon) {
                polygons.splice(i, 1);
                break;
            }
        }

        if (!mergedAnyPolygon) {
            return;
        }
    }
};

const calculateGeometryCenter = (geometry: LatLngTuple[]): LatLngTuple => {
    if (geometry.length === 0) {
        return [0, 0];
    }

    const latSum = geometry.map(point => point[0]).reduce((sum, lat) => sum + lat, 0);
    const lonSum = geometry.map(point => point[1]).reduce((sum, lon) => sum + lon, 0);

    return [latSum / geometry.length, lonSum / geometry.length];
};

type Marker = {
    lat: number;
    lon: number;
    tags: Record<string, string>;
};

type MapPolygon = {
    geometry: LatLngTuple[];
    tags: Record<string, string>;
    isClosed: boolean;
    role?: 'outer' | 'inner' | string;
    isVerySmall?: boolean;
};

type OSMNode = {
    type: 'node';
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
};

type OSMWay = {
    type: 'way';
    id?: number;
    ref?: number;
    bounds?: OSMBounds;
    center?: {
        lat: number;
        lon: number;
    };
    nodes?: number[];
    tags?: Record<string, string>;
    geometry?: { lat: number; lon: number }[];
    role?: 'outer' | 'inner' | string;
};

type OSMRelation = {
    type: 'relation';
    id: number;
    bounds: OSMBounds;
    members: OSMWay[];
    tags?: Record<string, string>;
};

type OSMBounds = {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
};
