import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { environment } from '../../../environments/environment';

interface IMapboxDrawEvent {
  features: GeoJSON.Feature<any>[],
  target: mapboxgl.Map,
  type: string,
  action?: string
};

const enum MapboxFeatureTypes {
  POLYGON = 'Polygon'
  // Other feature types...
};


@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit {
  map: mapboxgl.Map | undefined;
  style = 'mapbox://styles/mapbox/streets-v11';
  defaultCenteringPosition = [37.6173, 55.7558];

  constructor() { }

  ngOnInit(): void {
    this.initMap();
    this.map?.on('load', () => {
      navigator.geolocation.getCurrentPosition((position) => {
        this.centerMap.call(this, [position.coords.longitude, position.coords.latitude]);
      },
      () => {
        this.centerMap.call(this, this.defaultCenteringPosition);
      },
      {
        enableHighAccuracy: true
      })
    });
  }

  initMap(): void {
    this.map = new mapboxgl.Map({
      accessToken: environment.mapboxAccessToken,
      container: 'map',
      style: this.style,
      zoom: 10,
      pitch: 40,
      bearing: 20,
      antialias: true
    });
    this.map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-left'
    );
    this.map.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true
    }), 'top-left');
    const draw = this.map.addControl(new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      defaultMode: 'draw_polygon'
    }), 'top-left');

    this.map.on('draw.create', (e: IMapboxDrawEvent) => {
      if (e.features[0].geometry.type === MapboxFeatureTypes.POLYGON) {
        this.addSourceForPolygon( `source-${e.features[0].id}`,
                                  e.features[0].geometry.coordinates, {
                                  height: 2000,
                                  color: 'blue',
                                  base_height: 10
                                });

        this.addLayerForPolygon(`layer-${e.features[0].id}`,
                                `source-${e.features[0].id}`);
      }
    });
    this.map.on('draw.update', (e: IMapboxDrawEvent) => {
      if (draw.getLayer(`layer-${e.features[0].id}`) && this.map?.getSource(`source-${e.features[0].id}`)) {
        this.removeLayer(`layer-${e.features[0].id}`);
        this.removeSource(`source-${e.features[0].id}`);

        this.addSourceForPolygon( `source-${e.features[0].id}`,
                                  e.features[0].geometry.coordinates, {
                                    height: 2000,
                                    color: 'blue',
                                    base_height: 10
                                  });

        this.addLayerForPolygon(`layer-${e.features[0].id}`, `source-${e.features[0].id}`)
      }
    });

    this.map.on('draw.delete', (e: IMapboxDrawEvent) => {
      if (draw.getLayer(`layer-${e.features[0].id}`) && this.map?.getSource(`source-${e.features[0].id}`)) {
        this.removeLayer(`layer-${e.features[0].id}`);
        this.removeSource(`source-${e.features[0].id}`);
      }
    });
  }

  centerMap(coords: number[]): void {
    this.map?.flyTo({
      center: [coords[0], coords[1]]
    });
  }

  addSourceForPolygon(sourceId: string, coordinates: number[][][], properties: {[key: string]: any}): void {
    this.map?.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          coordinates: coordinates,
          type: 'Polygon',
        },
        properties
      }
    });
  }

  addLayerForPolygon(layerId: string, sourceId: string): void {
    this.map?.addLayer({
      id: layerId,
      type: 'fill-extrusion',
      source: sourceId,
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'base_height'],
        'fill-extrusion-opacity': 0.5
      }
    });
  }

  removeSource(sourceId: string): void {
    if (this.map?.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }
  }

  removeLayer(layerId: string): void {
    if (this.map?.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }
  }
}
