//@flow

import React, {
  PropTypes,
  Component
} from 'react';
import {
  View,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
  PixelRatio,
  Text,
} from 'react-native';
import ZKUtils from 'zhike-mobile-utils';
import Toast from 'react-native-root-toast';
import ZKListView from './ZKListView';

export default class PagedListView extends Component {
  state: { refreshing: bool, hasMore:bool, loadingMore:bool }
  _onPullDown: (e:any) => void
  _loadNextPage: () => Promise<any>
  _onEndReached: (e:any) => void
  _renderFooter: () => any
  _loadMore: () => void

  constructor(props:any) {
    super(props);
    this.state = {
      refreshing: false,
      hasMore: {}.hasOwnProperty.call(props, 'hasMore') ? !!props.hasMore : true,
      loadingMore:false,
    };
    this._onPullDown = this._onPullDown.bind(this);
    this._loadNextPage = this._loadNextPage.bind(this);
    this._onEndReached = this._onEndReached.bind(this);
    this._renderFooter = this._renderFooter.bind(this);
    this._loadMore = this._loadMore.bind(this);
  }

  componentWillMount() {
    if (!this.props.items || !this.props.items.length) {
      this.setState({ refreshing:true });
      this._loadNextPage()
      .catch((err) => {
        console.warn('failed to call _loadNextPage, error: ', err);
      })
      .then(() => {
        this.setState({ refreshing:false });
      });
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

  _loadNextPage() {
    return this.props.fetchItems(this._nextPage(), this.props.pageSize)// index starts from 1
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
    this.props.autoPaging && (this._loadMore());
  }

  _renderFooter() {
    return this.props.renderFooter ? this.props.renderFooter() : this._defaultFooter();
  }

  _defaultFooter() {
    return (
      <TouchableWithoutFeedback
        onPress={this._loadMore}
      >
        <View
          style={{
            alignSelf:'stretch',
            alignItems:'center',
            justifyContent:'center',
            height:40,
            backgroundColor:'#f7f8fa',
            borderTopWidth:1.0 / PixelRatio.get(),
            borderTopColor:'#e6e6e6',
          }}
        >
          {this.state.loadingMore ?
            <ActivityIndicator
              animating
              size={'small'}
            /> :
              <Text style={{ color:'#747474' }} >{this._loadMoreText()}</Text>
          }
        </View>
      </TouchableWithoutFeedback>
    );
  }

  _loadMoreText() {
    if (this.state.loadingMore) {
      return '...';
    }
    const ret = this.state.hasMore ?
    this.props.loadMorePrompt :
    this.props.noMorePrompt;
    return ret;
  }

  _loadMore() {
    if (this.state.loadingMore) {
      return;
    }

    if (!this.state.hasMore) {
      Toast.show(this.props.noMorePrompt || '没有更多数据了', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.CENTER,
        shadow: false,
        animation: true,
        hideOnPress: false,
        delay: 0,
      });
      return;
    }

    this.setState({ loadingMore: true });
    this._loadNextPage()
      .then((res) => {
        this.setState({ loadingMore: false });
      })
      .catch((err) => {
        this.setState({ loadingMore: false });
        console.error('failed to call _loadMore, error: ', err);
      });
  }

  render() {
    let { items, fetchItems, onScroll, style, separatorStyle, ...other } = this.props;
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
        {...other}
        onEndReached={this._onEndReached}
        renderFooter={this._renderFooter}
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
};

PagedListView.defaultProps = {
  pageSize: 10,
  startIndex: 1,
  hasMore: true,
  loadMorePrompt: '加载更多',
  noMorePrompt: '全部加载完毕',
};
