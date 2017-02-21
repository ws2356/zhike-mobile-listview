// @flow

import React, { Component, PropTypes } from 'react';
import {
  View,
} from 'react-native';
import OctopusView from './OctopusView';
import ScrollableTabBar from './ScrollableTabBar';

function WrappedHeaderView(props) {
  const {
    embededComponent,
    embededProps,
    onLayout,
    onHiddenPartLayout,
    activeTab,
    goToPage,
    tabs,
    tabBarProps,
    ...other } = props || {};

  embededProps && (embededProps.onLayout = onHiddenPartLayout);
  return (
    <View
      onLayout={onLayout}
      {...other || {}}
    >
      {React.createElement(embededComponent, embededProps)}
      <ScrollableTabBar
        tabs={tabs}
        activeTab={activeTab || 0}
        goToPage={goToPage}
        {...tabBarProps || {}}
      />
    </View>
  );
}

export default class FlexiblePageListView extends Component {
  constructor(props) {
    super(props);
    this.state = { currentPage:0 };
  }

  _headerInfo(extraProps) {
    if (!this.props || !this.props.headerInfo) {
      return null;
    }

    const props = extraProps && { ...extraProps } || {};
    props.tabBarProps = this.props.tabBarProps;
    props.embededProps = this.props.headerInfo.props;
    if (!this.props.headerInfo.component) {
      console.error('component is required prop');
      return null;
    } else {
      props.embededComponent = this.props.headerInfo.component;
      props.tabs = this.props.tabs;
    }
    return {
      component: WrappedHeaderView,
      props,
    };
  }

  render() {
    let { headerInfo, listInfo, ...other } = this.props || {};// eslint-disable-line
    return (
      <OctopusView
        {...other || {}}
        headerInfo={this._headerInfo({
          activeTab: this.state.currentPage,
          goToPage: (currentPage) => { this.setState({ currentPage }); },
        })}
        listInfo={listInfo}
        visiblePage={this.state.currentPage}
        onPageChange={(currentPage) => { this.setState({ currentPage }); }}
      />
    );
  }

}

FlexiblePageListView.propTypes = {
  // ...OctopusView.propTypes
  tabBarProps: PropTypes.object,// eslint-disable-line
};
