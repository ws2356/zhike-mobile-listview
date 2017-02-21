
'use strict';

import React, {Component, PropTypes} from 'react';
import {
  View,
  Image,
  ScrollView,
  Dimensions,
  Text,
} from 'react-native';

import _ from 'underscore';
import OctopusView from './OctopusView';
import ScrollableTabBar from '../misc/ScrollableTabBar';

let {width:ScreenW, height:ScreenH} = Dimensions.get('window');

class TestScrollView extends Component {
  scrollTo(offset) {
    this._scroll && this._scroll.scrollTo(offset);
  }

  render() {
    let {viewProps, num, ...other} = this.props;
    return (
      <ScrollView
        ref={scroll => (this._scroll = scroll)}
        scrollEventThrottle={16}
        {...other||{}}
      >
        <View
          {...viewProps}
        >
          {_.range(num).map(n => <Text key={"hehe" + n} >{`cell - ${n}`}</Text>)}
        </View>
      </ScrollView>
    );
  }
}

class WrappedHeaderView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: props.activeTab,
    };
  }

  render() {
    let {
      embededComponent,
      embededProps,
      onLayout,
      onHiddenPartLayout,
      goToPage,
      tabs,
      tabBarProps,
      ...other} = this.props || {};

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
          {...tabBarProps||{}}
        />
      </View>
    );
  }

  forceRender(activeTab) {
    this.setState({
      activeTab,
    });
  }
}

export default class FlexiblePageListView extends Component {
  constructor(props) {
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

  render() {
    let {headerInfo, listInfo, ...other} = this.props || {};
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

    let props = extraProps && {...extraProps} || {};
    props.tabBarProps = this.props.tabBarProps;
    props.embededProps = this.props.headerInfo.props;
    if (!this.props.headerInfo.component) {
      console.error('component is required prop');
      return null;
    }else {
      props.embededComponent = this.props.headerInfo.component;
      props.tabs = this.props.tabs;
    }
    return {
      component: WrappedHeaderView,
      props,
    };
  }
}

FlexiblePageListView.propTypes = {
  //...OctopusView.propTypes
  tabBarProps: PropTypes.object,
};
