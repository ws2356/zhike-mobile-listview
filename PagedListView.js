//@flow

import React, {
  Component
} from 'react';
import PropTypes from 'prop-types'
import {
  View,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
  PixelRatio,
  Text,
} from 'react-native';
import ZKListView from './ZKListView';

export default class PagedListView extends Component {
  state: { refreshing: bool, hasMore:bool, loadingMore:bool, showPageLoadingIndicator:bool }
  _onPullDown: (e:any) => void
  _loadNextPage: () => Promise<any>
  _onEndReached: (e:any) => void
  _renderFooter: () => any
  loadMore: () => void

  constructor(props:any) {
    super(props);
    this.state = {
      refreshing: false,
      hasMore: {}.hasOwnProperty.call(props, 'hasMore') ? !!props.hasMore : true,
      loadingMore:false,
      showPageLoadingIndicator: props.items && props.items.length,
    };
    this._onPullDown = this._onPullDown.bind(this);
    this._loadNextPage = this._loadNextPage.bind(this);
    this._onEndReached = this._onEndReached.bind(this);
    this._renderFooter = this._renderFooter.bind(this);
    this.loadMore = this.loadMore.bind(this);
  }

  componentWillMount() {
    if (!this.props.items || !this.props.items.length) {
      this.setState({ hasMore:true }, () => this.loadMore(true));
    }
  }

  componentWillReceiveProps(nextProps) {
    const showPageLoadingIndicator = nextProps.items && nextProps.items.length;
    if ((showPageLoadingIndicator && !this.state.showPageLoadingIndicator) ||
    (!showPageLoadingIndicator && this.state.showPageLoadingIndicator)) {
        this.setState({ showPageLoadingIndicator });
    }
  }

  _onPullDown(e) {
    this.setState({ refreshing:true });
    this.props.fetchItems(
      this.props.startIndex,
      this.props.pageSize * this._numberOfPages()
    )
    .then((res) => {
      this.setState({
        refreshing:false,
        hasMore: Array.isArray(res) && res.length >= this.props.pageSize,
      });
    })
    .catch((err) => {
      this.setState({ refreshing:false });
      console.error('failed to call fetchItems, error: ', err);
    });
  }

  _loadNextPage(initial:bool=false, context:any) {
    return this.props.fetchItems(initial ? this.props.startIndex : this._nextPage(), this.props.pageSize, !initial, context)// index starts from 1
    .then((res) => {
      this.setState({
        hasMore: Array.isArray(res) && res.length >= this.props.pageSize,
      });
    })
    .catch(err => {
      console.warn('error fetchItems: ', err);
    });
  }

  _nextPage() {
    return Math.floor(this.props.items.length / this.props.pageSize) + this.props.startIndex;
  }

  _numberOfPages() {
    return Math.floor((this.props.items.length + this.props.pageSize - 1) / this.props.pageSize);
  }

  _onEndReached(...args) {
    this.props.onEndReached && this.props.onEndReached(...args);
    this.props.autoPaging && this.state.hasMore && !this.state.loadingMore && (this.loadMore());
  }

  _renderFooter() {
    return this._defaultFooter();
  }

  _defaultFooter() {
    const { footerStyle } = this.props;
    if (this.props.hideFooterInitially) {
      if (!this.state.showPageLoadingIndicator) {
        return null;
      }
    }

    const staticFooter = this.props.renderFooter ? this.props.renderFooter({ loading: this.state.loadingMore }) :
      <Text style={{ color: '#747474', marginTop: 5 }} >{this._loadMoreText()}</Text>
    
    return (
      <TouchableWithoutFeedback
        onPress={this.loadMore}
      >
        <View
          style={[{
            alignSelf:'stretch',
            alignItems:'center',
            justifyContent:'center',
            backgroundColor:'#f7f8fa',
            borderTopWidth:1.0 / PixelRatio.get(),
            borderTopColor:'#e6e6e6',
            marginBottom:44,
          }, footerStyle]}
        >
          {
            this.state.loadingMore ? (
              this.props.renderLoadingAnimation ? this.props.renderLoadingAnimation({ loading:this.state.loadingMore }) :
                <ActivityIndicator
                  animating
                  size={'small'}
                />
            ) : null
          }
          {
            this.state.hasMore ? null : staticFooter
          }
        </View>
      </TouchableWithoutFeedback>
    );
  }

  _loadMoreText() {
    if (this.state.loadingMore) {
      return '加载中';
    }
    const ret = this.state.hasMore ?
    this.props.loadMorePrompt :
    this.props.noMorePrompt;
    return ret;
  }

  loadMoreOnce(initial?:bool, context:any) {
    this.setState({ loadingMore:false, hasMore:true }, () => this.loadMore(initial, context));
  }

  loadMore(initial?:bool= false, context:any) {
    if (this.state.loadingMore) {
      return;
    }

    if (!this.state.hasMore) {
      // Toast.show(this.props.noMorePrompt || '没有更多数据了', {
      //   duration: Toast.durations.SHORT,
      //   position: Toast.positions.CENTER,
      //   shadow: false,
      //   animation: true,
      //   hideOnPress: false,
      //   delay: 0,
      // });
      return;
    }

    this.setState((prevState) => {
      if (!prevState.loadingMore) {
        this._loadNextPage(initial, context)
          .then((res) => {
            this.setState({ loadingMore: false });
          })
          .catch((err) => {
            this.setState({ loadingMore: false });
            console.error('failed to call loadMore, error: ', err);
          });
        return { ...prevState, loadingMore:true };
      } else {
        return prevState;
      }
    });
  }

  render() {
    let { items, fetchItems, onScroll, style, separatorStyle, listViewPageSize, ...other } = this.props;
    other = other || {};
    return (
      <ZKListView
        style={[{ backgroundColor:'#f5f5f5' }, style]}
        dataSource={this.props.genDataSource(this.props.items)}
        refreshControl={!this.props.pulldownRefresh ? null :
          <RefreshControl
            refreshing={!!this.state.refreshing}
            onRefresh={this._onPullDown}
            tintColor="#00B5E9"
            title="正在加载中..."
            progressBackgroundColor="#ffff00"
          />
        }
        onEndReachedThreshold={100}
        {...other}
        onEndReached={this._onEndReached}
        renderFooter={this._renderFooter}
        {...(listViewPageSize ? { pageSize: listViewPageSize } : {})}
      />
    );
  }
}

PagedListView.propTypes = {
  ...ZKListView.propTypes,
  items: PropTypes.arrayOf(PropTypes.object),
  fetchItems: PropTypes.func.isRequired,// (page, pageSize) => Promise<{items, totalPage}>
  pageSize: PropTypes.number,
  genDataSource: PropTypes.func.isRequired,
  startIndex: PropTypes.number,

  autoPaging: PropTypes.bool,
  hasMore: PropTypes.bool,
  loadMorePrompt: PropTypes.string,
  noMorePrompt: PropTypes.string,
  pulldownRefresh: PropTypes.bool,
  hideFooterInitially: PropTypes.bool,
  footerStyle: PropTypes.any,
};

PagedListView.defaultProps = {
  pageSize: 10,
  startIndex: 1,
  hasMore: true,
  loadMorePrompt: '加载更多',
  noMorePrompt: '全部加载完毕',
  hideFooterInitially: true,
};
