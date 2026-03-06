declare module 'react-leaflet-draw' {
    import { FC } from 'react'

    interface EditControlProps {
        position?: string
        onEdited?: Function
        onCreated?: Function
        onDeleted?: Function
        onMounted?: Function
        onEditStart?: Function
        onEditStop?: Function
        onDeleteStart?: Function
        onDeleteStop?: Function
        draw?: {
            polyline?: any
            polygon?: any
            rectangle?: any
            circle?: any
            marker?: any
            circlemarker?: any
        }
        edit?: {
            edit?: any
            remove?: any
            poly?: any
            featureGroup?: any
        }
    }

    export const EditControl: FC<EditControlProps>
}
