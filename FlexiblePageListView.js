// @flow

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  View,
} from 'react-native';
import OctopusView from './OctopusView';
import ScrollableTabBar from './ScrollableTabBar';

class WrappedHeaderView extends Component {
  state: { activeTab: number}
  _ref: any

  constructor(props:any) {
    super(props);
    this.state = {
      activeTab: props.activeTab,
    };
  }

  forceRender(activeTab:number) {
    this.setState({
      activeTab,
    });
  }

  render() {
    const {
      embededComponent,
      embededProps,
      onLayout,
      onHiddenPartLayout,
      goToPage,
      tabs,
      tabBarProps,
      ...other } = this.props || {};

    embededProps && (embededProps.onLayout = onHiddenPartLayout);
    return (
      <View
        onLayout={onLayout}
        {...other || {}}
      >
        {React.createElement(embededComponent, embededProps)}
        <ScrollableTabBar
          ref={ref => (this._ref = ref)}
          tabs={tabs}
          activeTab={this.state.activeTab || 0}
          goToPage={goToPage}
          {...tabBarProps || {}}
        />
      </View>
    );
  }

}

export default class FlexiblePageListView extends Component {
  state: {
    currentPage: number,
    headerInfo: any,
  }

  _handlePageChange: any

  constructor(props:any) {
    super(props);
    this._handlePageChange = this._handlePageChange.bind(this);
    this.state = {
      currentPage:0,
      headerInfo:this._genHeaderInfo({
        activeTab: 0,
        goToPage: this._handlePageChange,
      }),
    };
  }

  _handlePageChange(currentPage) {
    if (currentPage === this.state.currentPage) {
      return;
    }
    this.setState({
      currentPage,
      headerInfo: this._genHeaderInfo({
        activeTab: currentPage,
        goToPage:this._handlePageChange,
      })
    });
  }

  _genHeaderInfo(extraProps) {
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
    const { headerInfo, listInfo, ...other } = this.props || {};
    return (
      <OctopusView
        {...other || {}}
        headerInfo={this.state.headerInfo}
        listInfo={listInfo}
        visiblePage={this.state.currentPage}
        onPageChange={this._handlePageChange}
      />
    );
  }

}

FlexiblePageListView.propTypes = {
  // ...OctopusView.propTypes
  tabBarProps: PropTypes.object,
};
