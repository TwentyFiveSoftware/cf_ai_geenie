import React, { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { type LatLngTuple } from 'leaflet';

export type OSMElement = OSMNode | OSMWay | OSMRelation;

export const ResultMap: React.FC<{ elements: OSMElement[] }> = ({ elements }) => {
    const markers = useMemo(() => {
        try {
            return buildMarkers(elements);
        } catch (err) {
            console.error(err);
            return [];
        }
    }, [elements]);

    const polygons = useMemo(() => {
        try {
            return buildPolygons(elements);
        } catch (err) {
            console.error(err);
            return [];
        }
    }, [elements]);

    if (markers.length === 0 && polygons.length === 0) {
        return (
            <div className="w-full rounded-xl border-2 py-10 text-center color-muted">
                No results to show on a map.
            </div>
        );
    }

    return (
        <MapContainer
            center={[0, 0]}
            zoom={10}
            scrollWheelZoom={true}
            className="w-full rounded-xl aspect-square sm:aspect-[3/2]"
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MapLayers markers={markers} polygons={polygons} />
        </MapContainer>
    );
};

const MapLayers: React.FC<{ markers: MapMarker[]; polygons: MapPolygon[] }> = ({ markers, polygons }) => {
    const map = useMap();

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

            {polygons.map((polygon, index) => {
                return (
                    <React.Fragment key={index}>
                        {polygon.isClosed ? (
                            <Polygon key={index} pathOptions={{ color: 'red' }} positions={polygon.geometry}>
                                <MapPopup tags={polygon.tags} />
                            </Polygon>
                        ) : (
                            <Polyline pathOptions={{ color: 'black', weight: 7 }} positions={polygon.geometry}>
                                <MapPopup tags={polygon.tags} />
                            </Polyline>
                        )}

                        {isSmallPolygon(polygon) && (
                            <CircleMarker
                                pathOptions={{ color: 'blue', weight: 2 }}
                                center={calculateGeometryCenter(polygon.geometry)}
                                radius={7}
                            >
                                <MapPopup tags={polygon.tags} />
                            </CircleMarker>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

const MapPopup: React.FC<{ tags: Record<string, string> }> = ({ tags }) => {
    if (Object.keys(tags).length === 0) {
        return <></>;
    }

    return (
        <Popup>
            <div className="py-1">
                {'name' in tags && <div className="text-lg font-bold mb-3 leading-[1.1]">{tags.name}</div>}

                <div className="w-full grid gap-x-3 gap-y-1 grid-cols-[minmax(auto,_50%)_1fr] items-center">
                    {Object.entries(tags).map(([key, value]) => (
                        <React.Fragment key={key}>
                            <div className="break-words whitespace-normal leading-3 font-bold">{key}</div>
                            <div className="break-words whitespace-normal leading-3 min-w-[150px]">{value}</div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </Popup>
    );
};

const buildMarkers = (elements: OSMElement[]): MapMarker[] => {
    return elements
        .filter(element => element.type === 'node' && element.tags)
        .map(node => node as OSMNode)
        .map(
            node =>
                ({
                    lat: node.lat,
                    lon: node.lon,
                    tags: node.tags!,
                }) satisfies MapMarker,
        );
};

const buildPolygons = (elements: OSMElement[]): MapPolygon[] => {
    const nodes: OSMNode[] = elements.filter(element => element.type === 'node');
    const ways: OSMWay[] = elements.filter(element => element.type === 'way');
    const relations: OSMRelation[] = elements.filter(element => element.type === 'relation');

    const wayPolygons: MapPolygon[] = [];

    // build 'way' polygons
    for (const way of ways) {
        if (way.geometry) {
            // independent way that can be used directly
            wayPolygons.push(
                getMapPolygonFromWay(
                    way,
                    way.geometry.map<LatLngTuple>(point => [point.lat, point.lon]),
                ),
            );

            continue;
        }

        if (way.nodes) {
            // find referenced nodes based on id
            const geometry: LatLngTuple[] = way.nodes.flatMap(id => {
                const node = nodes.find(node => node.id === id);
                return node ? [[node.lat, node.lon]] : [];
            });

            // if some referenced nodes does not exit, ignore this way
            if (geometry.length !== way.nodes.length) {
                continue;
            }

            wayPolygons.push(getMapPolygonFromWay(way, geometry));
        }
    }

    const relationPolygons: MapPolygon[] = [];

    // build 'relation' polygons
    for (const relation of relations) {
        if (!relation.members) {
            continue;
        }

        const polygons: MapPolygon[] = [];

        for (const member of relation.members) {
            if (member.type === 'node') {
                continue; // ignore nodes inside relations
            }

            if (member.type === 'way') {
                if (member.geometry) {
                    // independent way that can be used directly
                    polygons.push({
                        id: member.id,
                        geometry: member.geometry.map<LatLngTuple>(point => [point.lat, point.lon]) ?? [],
                        tags: relation.tags ?? member.tags ?? {},
                        isClosed: member.role === 'inner' || member.role === 'outer',
                        role: member.role,
                    } satisfies MapPolygon);
                } else if (member.ref) {
                    // find way based on id
                    const index = wayPolygons.findIndex(wayPolygon => wayPolygon.id === member.ref);
                    if (index === -1) {
                        continue;
                    }

                    const wayPolygon = wayPolygons[index];

                    wayPolygons.splice(index, 1);

                    polygons.push({
                        id: member.ref,
                        geometry: wayPolygon.geometry,
                        tags: relation.tags ?? member.tags ?? wayPolygon.tags,
                        isClosed: member.role === 'inner' || member.role === 'outer',
                        role: member.role,
                    } satisfies MapPolygon);
                }
            }
        }

        mergePolygonsInPlace(polygons);
        relationPolygons.push(...polygons);
    }

    return [...wayPolygons, ...relationPolygons];
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

const getMapPolygonFromWay = (way: OSMWay, geometry: LatLngTuple[]) =>
    ({
        id: way.id,
        geometry,
        tags: way.tags ?? {},
        isClosed: way.nodes && way.nodes.length >= 2 ? way.nodes[0] === way.nodes[way.nodes.length - 1] : false,
    }) satisfies MapPolygon;

const isSmallPolygon = (polygon: MapPolygon): boolean => {
    const latitudes = polygon.geometry.map(point => point[0]);
    const longitudes = polygon.geometry.map(point => point[1]);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);

    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    return Math.abs(maxLat - minLat) < 0.0005 && Math.abs(maxLon - minLon) < 0.0005;
};

type MapMarker = {
    lat: number;
    lon: number;
    tags: Record<string, string>;
};

type MapPolygon = {
    id?: number;
    geometry: LatLngTuple[];
    tags: Record<string, string>;
    isClosed: boolean;
    role?: 'outer' | 'inner' | string;
};

type OSMNode = {
    type: 'node';
    id?: number;
    ref?: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
    role?: string;
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
    bounds?: OSMBounds;
    members?: (OSMWay | OSMNode)[];
    tags?: Record<string, string>;
};

type OSMBounds = {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
};
