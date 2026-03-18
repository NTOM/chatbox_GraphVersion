import { app } from 'electron'
import {
  APP_DISPLAY_NAME,
  APP_USER_MODEL_ID,
  SHARED_USER_DATA_PATH,
} from './appIdentity'

app.setName(APP_DISPLAY_NAME)
app.setPath('userData', SHARED_USER_DATA_PATH)
app.setPath('sessionData', SHARED_USER_DATA_PATH)

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID)
}

void import('./main.js')

