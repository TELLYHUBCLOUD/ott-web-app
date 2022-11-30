import React, { Component } from 'react';
import { getI18n, I18nextProvider } from 'react-i18next';
import InPlayer from '@inplayer-org/inplayer.js';

import { initializeInPlayerAccount } from './stores/inplayer/AccountController';

import type { Config } from '#types/Config';
import Router from '#src/containers/Router/Router';
import LoadingOverlay from '#components/LoadingOverlay/LoadingOverlay';
import QueryProvider from '#src/providers/QueryProvider';
import { restoreWatchHistory } from '#src/stores/WatchHistoryController';
import { initializeAccount } from '#src/stores/AccountController';
import { initializeFavorites } from '#src/stores/FavoritesController';
import { logDev } from '#src/utils/common';
import { loadAndValidateConfig } from '#src/utils/configLoad';
import { clearStoredConfig } from '#src/utils/configOverride';
import { PersonalShelf } from '#src/enum/PersonalShelf';
import initI18n from '#src/i18n/config';

import '#src/screenMapping';
import '#src/styles/main.scss';

interface State {
  error: Error | null;
  isLoading: boolean;
}

class App extends Component {
  public state: State = {
    error: null,
    isLoading: true,
  };

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  async initializeServices(config: Config) {
    if (config?.integrations?.cleeng?.id) {
      await initializeAccount();
    }

    if (config?.integrations?.inplayer?.clientId) {
      InPlayer.setConfig(import.meta.env.APP_INPLAYER_SDK);
      await initializeInPlayerAccount();
    }

    // We only request favorites and continue_watching data if there is a corresponding item in the content section
    // and a playlist in the features section.
    // We first initialize the account otherwise if we have favorites saved as externalData and in a local storage the sections may blink
    if (config.features?.continueWatchingList && config.content.some((el) => el.type === PersonalShelf.ContinueWatching)) {
      await restoreWatchHistory();
    }

    if (config.features?.favoritesList && config.content.some((el) => el.type === PersonalShelf.Favorites)) {
      await initializeFavorites();
    }
  }

  configLoadingHandler = (isLoading: boolean) => {
    this.setState({ isLoading });
    logDev(`Loading config: ${isLoading}`);
  };

  configErrorHandler = (error: Error) => {
    clearStoredConfig();

    this.setState({ error });
    this.setState({ isLoading: false });
    logDev('Error while loading the config:', error);
  };

  configValidationCompletedHandler = async (config: Config) => {
    await this.initializeServices(config);
    this.setState({ isLoading: false });
  };

  async componentDidMount() {
    await initI18n();
    await loadAndValidateConfig(this.configLoadingHandler, this.configErrorHandler, this.configValidationCompletedHandler);
  }

  render() {
    const { isLoading, error } = this.state;

    if (isLoading) {
      return <LoadingOverlay />;
    }

    return (
      <I18nextProvider i18n={getI18n()}>
        <QueryProvider>
          <Router error={error} />
        </QueryProvider>
      </I18nextProvider>
    );
  }
}

export default App;
